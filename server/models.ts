export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  maxTokens: number;
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    description: "Advanced reasoning model with step-by-step thinking",
    maxTokens: 8192
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    description: "Latest Gemini model with enhanced capabilities",
    maxTokens: 8192
  },

  {
    id: "ai21/jamba-1.6-large",
    name: "Jamba 1.6 Large",
    provider: "OpenRouter",
    description: "Large language model by AI21 Labs",
    maxTokens: 8192
  },
  {
    id: "cohere/command-r-plus",
    name: "Command R+",
    provider: "OpenRouter",
    description: "Cohere's advanced command model",
    maxTokens: 8192
  }
];

export function getModelById(id: string): AIModel | undefined {
  return AVAILABLE_MODELS.find(model => model.id === id);
}

export function getDefaultModel(): AIModel {
  return AVAILABLE_MODELS[0]; // DeepSeek R1 as default
}