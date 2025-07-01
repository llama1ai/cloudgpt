// Cloudflare Workers compatible version
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Hardcoded API keys from existing project configuration
const API_KEYS = {
  OPENAI_API_KEY: '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',
  OPENROUTER_API_KEY: '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', 
  GOOGLE_AI_API_KEY: 'AIzaSyDm221lmyBzeHYcHnhrFIL0wrqFUYZIPko'
};

interface Env {
  NODE_ENV?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Add CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Basic models endpoint
app.get('/api/models', (c) => {
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
    }
  ];
  return c.json(models);
});

// Debug endpoint
app.get('/api/debug', (c) => {
  return c.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "2.0-cloudflare-workers-hardcoded-keys",
    apiKeysConfigured: {
      openai: API_KEYS.OPENAI_API_KEY !== 'your-openai-api-key-here',
      openrouter: API_KEYS.OPENROUTER_API_KEY !== 'your-openrouter-api-key-here',
      google: API_KEYS.GOOGLE_AI_API_KEY !== 'your-google-ai-api-key-here'
    }
  });
});

// Placeholder endpoints for chat functionality
app.get('/api/messages', (c) => {
  // For now, return empty array
  // In full implementation, this would connect to storage
  return c.json([]);
});

app.post('/api/messages', async (c) => {
  try {
    const body = await c.req.json();
    
    // Basic validation
    if (!body.content) {
      return c.json({ error: 'Content is required' }, 400);
    }

    // For now, return a simple response
    // In full implementation, this would process through AI models
    const response = {
      id: Date.now(),
      content: "Placeholder response - AI integration needs to be implemented for Cloudflare Workers",
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

app.get('/api/chat-sessions', (c) => {
  // Return empty sessions for now
  return c.json([]);
});

app.post('/api/chat-sessions', async (c) => {
  const body = await c.req.json();
  const session = {
    id: Date.now(),
    title: body.title || 'New Chat',
    timestamp: new Date().toISOString()
  };
  return c.json(session);
});

// Serve static files for everything else
app.get('*', async (c) => {
  const url = new URL(c.req.url);
  let pathname = url.pathname;
  
  // Handle root
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  // For SPA routing, serve index.html for routes that don't have file extensions
  if (!pathname.includes('.') && pathname !== '/index.html') {
    pathname = '/index.html';
  }
  
  // In a real deployment, this would serve from the Workers static assets
  // For now, return a placeholder
  if (pathname === '/index.html') {
    return c.html(`
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Chat - Cloudflare Workers</title>
</head>
<body>
    <div id="root">
        <h1>AI Chat Application</h1>
        <p>This is a placeholder page. To deploy properly:</p>
        <ol>
            <li>Build the frontend: <code>npm run build</code></li>
            <li>Configure wrangler.toml with your project settings</li>
            <li>Set environment variables in Cloudflare dashboard</li>
            <li>Deploy: <code>npx wrangler deploy</code></li>
        </ol>
        <p>API endpoints are working at: <a href="/api/debug">/api/debug</a></p>
    </div>
</body>
</html>
    `);
  }
  
  return c.text('Not Found', 404);
});

export default app;