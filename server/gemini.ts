import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "./system-prompt";

export interface ChatResponseWithReasoning {
  content: string;
  reasoning?: string;
}

const ai = new GoogleGenAI({ 
  apiKey: "AIzaSyDm221lmyBzeHYcHnhrFIL0wrqFUYZIPko"
});

export async function getGeminiChatResponse(
  messages: Array<{ role: string; content: string }>,
  onReasoningChunk?: (chunk: string) => void,
  onContentChunk?: (chunk: string) => void
): Promise<ChatResponseWithReasoning> {
  try {
    // Get the latest user message
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || latestMessage.role !== "user") {
      throw new Error("No user message found");
    }

    // Create conversation history for context (only take last few messages for efficiency)
    const conversationHistory = messages.slice(-10).map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContentStream({
      model: "gemini-2.5-pro",
      contents: conversationHistory,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
        maxOutputTokens: 8192,
        thinkingConfig: {
          includeThoughts: true,
          thinkingBudget: -1  // Dynamic thinking
        }
      }
    });

    let fullContent = "";
    let fullReasoning = "";

    // Stream chunks using Gemini's native thinking API
    for await (const chunk of response) {
      if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].content) {
        const parts = chunk.candidates[0].content.parts || [];
        
        for (const part of parts) {
          if (!part.text) continue;
          
          if (part.thought) {
            // This is reasoning content from Gemini's thinking
            fullReasoning += part.text;
            if (onReasoningChunk) {
              onReasoningChunk(part.text);
            }
          } else {
            // This is regular content
            fullContent += part.text;
            if (onContentChunk) {
              onContentChunk(part.text);
            }
          }
        }
      }
    }

    return {
      content: fullContent,
      reasoning: fullReasoning || undefined
    };
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}