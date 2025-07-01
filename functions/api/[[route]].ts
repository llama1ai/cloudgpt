// Cloudflare Pages Function to handle all API routes
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Hardcoded API keys from existing project configuration
const API_KEYS = {
  OPENAI_API_KEY: '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',
  OPENROUTER_API_KEY: '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', 
  GOOGLE_AI_API_KEY: 'AIzaSyDm221lmyBzeHYcHnhrFIL0wrqFUYZIPko'
};

const app = new Hono();

// Add CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Basic models endpoint
app.get('/models', (c) => {
  const models = [
    {
      id: "deepseek-r1",
      name: "DeepSeek R1",
      provider: "openrouter",
      description: "Advanced reasoning model",
      maxTokens: 8192
    },
    {
      id: "gpt-4o",
      name: "GPT-4o",
      provider: "openai", 
      description: "OpenAI's latest model",
      maxTokens: 4096
    },
    {
      id: "gemini-2.0-flash-thinking",
      name: "Gemini 2.0 Flash Thinking",
      provider: "gemini",
      description: "Google's latest thinking model",
      maxTokens: 8192
    }
  ];
  return c.json(models);
});

// Debug endpoint
app.get('/debug', (c) => {
  return c.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "2.0-cloudflare-pages-functions",
    apiKeysConfigured: {
      openai: API_KEYS.OPENAI_API_KEY !== 'your-openai-api-key-here',
      openrouter: API_KEYS.OPENROUTER_API_KEY !== 'your-openrouter-api-key-here',
      google: API_KEYS.GOOGLE_AI_API_KEY !== 'your-google-ai-api-key-here'
    }
  });
});

// Placeholder endpoints for chat functionality
app.get('/messages', (c) => {
  return c.json([]);
});

app.post('/messages', async (c) => {
  try {
    const body = await c.req.json();
    
    if (!body.content) {
      return c.json({ error: 'Content is required' }, 400);
    }

    // For now, return a simple response
    const response = {
      id: Date.now(),
      content: "Placeholder response - full AI integration coming soon",
      role: "assistant",
      timestamp: new Date().toISOString(),
      sessionId: body.sessionId || 1
    };

    return c.json([
      {
        id: Date.now() - 1,
        content: body.content,
        role: "user", 
        timestamp: new Date().toISOString(),
        sessionId: body.sessionId || 1
      },
      response
    ]);
  } catch (error) {
    return c.json({ error: 'Failed to process message' }, 500);
  }
});

app.get('/chat-sessions', (c) => {
  return c.json([]);
});

app.post('/chat-sessions', async (c) => {
  const body = await c.req.json();
  const session = {
    id: Date.now(),
    title: body.title || 'New Chat',
    timestamp: new Date().toISOString()
  };
  return c.json(session);
});

// Handle all routes
export const onRequest = app.fetch;