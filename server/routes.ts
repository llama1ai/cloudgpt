import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema, insertChatSessionSchema } from "@shared/schema";
import { getChatResponse } from "./openai";
import { getGeminiChatResponse } from "./gemini";
import { getOpenRouterChatResponse } from "./openrouter";
import { AVAILABLE_MODELS, getModelById, getDefaultModel } from "./models";

// Generate chat title from user message
function generateChatTitle(message: string): string {
  // Remove extra whitespace and limit length
  const cleaned = message.trim().replace(/\s+/g, ' ');
  
  // If message is short enough, use it as is
  if (cleaned.length <= 50) {
    return cleaned;
  }
  
  // For longer messages, take first part and add ellipsis
  const truncated = cleaned.substring(0, 47).trim();
  return truncated + '...';
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Debug endpoint
  app.get("/api/debug", async (req, res) => {
    res.json({ 
      status: "OK", 
      timestamp: new Date().toISOString(),
      version: "2.0-fixed-reasoning"
    });
  });

  // Get available AI models
  app.get("/api/models", async (req, res) => {
    res.json(AVAILABLE_MODELS);
  });

  // Get all messages (optionally filtered by sessionId)
  app.get("/api/messages", async (req, res) => {
    try {
      const sessionId = req.query.sessionId ? parseInt(req.query.sessionId as string) : undefined;
      const messages = await storage.getMessages(sessionId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Send a message and get AI response with streaming
  app.post("/api/messages", async (req, res) => {
    try {
      const { model: modelId = "deepseek-r1", ...messageData } = req.body;
      const validatedData = insertMessageSchema.parse(messageData);
      
      // Get the selected model
      const selectedModel = getModelById(modelId) || getDefaultModel();
      console.log(`Using model: ${selectedModel.name} (${selectedModel.id})`);
      
      // Store user message with provided sessionId or create new session
      let sessionId = validatedData.sessionId;
      
      // If no sessionId provided, create a new session
      if (!sessionId) {
        const newSession = await storage.createChatSession({
          title: validatedData.content.slice(0, 50) + (validatedData.content.length > 50 ? '...' : '')
        });
        sessionId = newSession.id;
      }
      
      const userMessage = await storage.createMessage({
        ...validatedData,
        sessionId
      });
      
      // Set up SSE headers for streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Don't send user message via SSE - let frontend fetch all messages

      // Get all messages for context including the new user message
      const existingMessages = await storage.getMessages(sessionId);
      
      // Format messages for AI context with full content including reasoning
      const contextMessages = existingMessages.map((msg: any) => {
        let content = msg.content;
        
        // If it's an assistant message with reasoning, include it in context
        if (msg.role === 'assistant' && msg.reasoning) {
          content = `<reasoning>${msg.reasoning}</reasoning>\n\n${msg.content}`;
        }
        
        return {
          role: msg.role,
          content: content
        };
      });

      // Debug: log context messages to see what AI receives
      console.log('Context messages for AI:', JSON.stringify(contextMessages, null, 2));

      let aiResponse;
      
      // Use appropriate AI service based on model
      if (selectedModel.id === "gemini-2.5-pro") {
        aiResponse = await getGeminiChatResponse(
          contextMessages,
          (reasoning) => {
            if (reasoning) {
              res.write(`data: ${JSON.stringify({ type: 'reasoning', data: reasoning })}\n\n`);
            }
          },
          (content) => {
            if (content) {
              res.write(`data: ${JSON.stringify({ type: 'content', data: content })}\n\n`);
            }
          }
        );
      } else if (selectedModel.provider === "OpenRouter") {
        // OpenRouter models
        aiResponse = await getOpenRouterChatResponse(
          contextMessages,
          selectedModel.id,
          (type, chunk) => {
            res.write(`data: ${JSON.stringify({ type, data: chunk })}\n\n`);
          }
        );
      } else {
        // Default to DeepSeek
        aiResponse = await getChatResponse(validatedData.content, (reasoning, content) => {
          if (reasoning) {
            res.write(`data: ${JSON.stringify({ type: 'reasoning', data: reasoning })}\n\n`);
          }
          if (content) {
            res.write(`data: ${JSON.stringify({ type: 'content', data: content })}\n\n`);
          }
        });
      }
      
      // Store AI response
      const aiMessage = await storage.createMessage({
        content: aiResponse.content,
        role: "assistant",
        reasoning: aiResponse.reasoning,
        sessionId: sessionId
      });

      // Generate title for new session if this is the first message pair
      const sessionMessages = await storage.getMessages(sessionId);
      if (sessionMessages.length === 2) { // user message + ai response = new chat
        const title = generateChatTitle(validatedData.content);
        await storage.updateChatSessionTitle(sessionId, title);
      }

      // Send final message and close
      res.write(`data: ${JSON.stringify({ type: 'assistantMessage', data: aiMessage })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Error processing message:", error);
      res.write(`data: ${JSON.stringify({ type: 'error', data: error.message })}\n\n`);
      res.end();
    }
  });

  // Chat Sessions endpoints
  app.get("/api/chat-sessions", async (req, res) => {
    try {
      const sessions = await storage.getChatSessions();
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/chat-sessions", async (req, res) => {
    try {
      const validatedData = insertChatSessionSchema.parse(req.body);
      const session = await storage.createChatSession(validatedData);
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/chat-sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteChatSession(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/chat-sessions/:id/messages", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.clearMessages(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
