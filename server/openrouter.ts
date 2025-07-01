import { SYSTEM_PROMPT } from "./system-prompt";

export interface ChatResponseWithReasoning {
  content: string;
  reasoning?: string;
}

const OPENROUTER_API_KEY = "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";

// Models that support reasoning
const REASONING_MODELS: string[] = [
  // No reasoning models currently enabled
];

export async function getOpenRouterChatResponse(
  messages: { role: string; content: string }[],
  modelId: string,
  onChunk?: (type: 'reasoning' | 'content', chunk: string) => void
): Promise<ChatResponseWithReasoning> {
  const isReasoningModel = REASONING_MODELS.includes(modelId);
  
  // Add system prompt to messages
  const messagesWithSystem = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages
  ];
  
  // Debug: log system prompt being sent
  console.log('OpenRouter system prompt length:', SYSTEM_PROMPT.length);
  console.log('OpenRouter messages with system:', JSON.stringify(messagesWithSystem.map(m => ({
    role: m.role,
    content: m.role === 'system' ? m.content.substring(0, 100) + '...' : m.content
  })), null, 2));
  
  const payload: any = {
    model: modelId,
    messages: messagesWithSystem,
    stream: true,
    temperature: 0.7,
  };

  // Add reasoning parameters for supporting models
  if (isReasoningModel) {
    payload.reasoning = {
      max_tokens: 2000,
      effort: "high"
    };
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:5000",
      "X-Title": "AI Chat App"
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`OpenRouter API error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }

  let content = "";
  let reasoning = "";
  let currentSection: 'reasoning' | 'content' = 'content';

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error("No response body reader available");
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            
            if (!delta) continue;

            // Handle reasoning content for models that support it
            if (isReasoningModel && delta.reasoning) {
              reasoning += delta.reasoning;
              onChunk?.('reasoning', delta.reasoning);
              currentSection = 'reasoning';
            }
            
            // Handle regular content
            if (delta.content) {
              content += delta.content;
              onChunk?.('content', delta.content);
              currentSection = 'content';
            }
          } catch (parseError) {
            console.warn("Failed to parse OpenRouter response chunk:", data);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return {
    content: content.trim(),
    reasoning: reasoning.trim() || undefined
  };
}