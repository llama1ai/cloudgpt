import OpenAI from "openai";
import { SYSTEM_PROMPT } from "./system-prompt";

const openai = new OpenAI({
  apiKey: "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",
  baseURL: "https://integrate.api.nvidia.com/v1",
});

export interface ChatResponseWithReasoning {
  content: string;
  reasoning?: string;
}

export async function getChatResponse(
  message: string,
  onStream?: (reasoning: string, content: string) => void
): Promise<ChatResponseWithReasoning> {
  try {
    console.log("Starting AI request for message:", message);
    const completion = await openai.chat.completions.create({
      model: "deepseek-ai/deepseek-r1-0528",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.6,
      top_p: 0.7,
      max_tokens: 2048,
      stream: true
    });

    let reasoning = "";
    let content = "";

    console.log("Processing streaming response...");
    let chunkCount = 0;
    
    for await (const chunk of completion) {
      chunkCount++;
      const delta = chunk.choices[0]?.delta as any;
      
      // Log every 50th chunk to avoid spam
      if (chunkCount % 50 === 0) {
        console.log(`Chunk ${chunkCount}, delta:`, JSON.stringify(delta));
      }
      
      const reasoningChunk = delta?.reasoning_content;
      if (reasoningChunk) {
        reasoning += reasoningChunk;
        // Log reasoning chunks to debug
        if (chunkCount <= 10) {
          console.log("Reasoning chunk:", JSON.stringify(reasoningChunk));
        }
        // Always stream reasoning chunks - no length limit
        if (onStream) {
          onStream(reasoningChunk, "");
        }
      }
      
      const contentChunk = delta?.content;
      if (contentChunk) {
        content += contentChunk;
        console.log("Content chunk:", contentChunk);
        if (onStream) {
          onStream("", contentChunk);
        }
      }
      
      // No artificial limits on reasoning length - let the model complete naturally
    }
    
    console.log(`Stream complete. Chunks: ${chunkCount}, Reasoning: ${reasoning.length}, Content: ${content.length}`);

    return {
      content: content.trim() || "I apologize, but I couldn't generate a response. Please try again.",
      reasoning: reasoning.trim() || undefined
    };
  } catch (error: any) {
    console.error("NVIDIA DeepSeek API error:", error);
    throw new Error(`Failed to get AI response: ${error.message}`);
  }
}
