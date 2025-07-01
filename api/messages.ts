import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../server/storage';
import { insertMessageSchema } from '../shared/schema';
import { getChatResponse } from '../server/openai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Get all messages
      const messages = await storage.getMessages();
      return res.json(messages);
    }

    if (req.method === 'POST') {
      // Send a message and get AI response with streaming
      const validatedData = insertMessageSchema.parse(req.body);
      
      // Store user message
      const userMessage = await storage.createMessage(validatedData);
      
      // Set up SSE headers for streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send user message first
      res.write(`data: ${JSON.stringify({ type: 'userMessage', data: userMessage })}\n\n`);

      try {
        // Get AI response with streaming
        const aiResponse = await getChatResponse(
          validatedData.content,
          (reasoning: string, content: string) => {
            if (reasoning) {
              res.write(`data: ${JSON.stringify({ type: 'reasoning', data: reasoning })}\n\n`);
            }
            if (content) {
              res.write(`data: ${JSON.stringify({ type: 'content', data: content })}\n\n`);
            }
          }
        );

        // Store AI message
        const assistantMessage = await storage.createMessage({
          content: aiResponse.content,
          role: 'assistant',
          reasoning: aiResponse.reasoning
        });

        // Send final response
        res.write(`data: ${JSON.stringify({ type: 'assistantMessage', data: assistantMessage })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
        
      } catch (error: any) {
        console.error('Error processing message:', error);
        
        // Create error message
        const errorMessage = await storage.createMessage({
          content: 'Przepraszam, wystąpił błąd podczas przetwarzania wiadomości. Spróbuj ponownie.',
          role: 'assistant'
        });

        res.write(`data: ${JSON.stringify({ type: 'assistantMessage', data: errorMessage })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
      }

      return res.end();
    }

    // Method not allowed
    return res.status(405).json({ message: 'Method not allowed' });

  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}