import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  maxTokens: number;
}

interface ModelSelectorProps {
  models: AIModel[];
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
}

export function ModelSelector({ models, selectedModel, onModelSelect }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentModel = models.find(m => m.id === selectedModel) || models[0];
  
  if (!currentModel) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center space-x-2 text-lg font-semibold text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <span>{currentModel.name}</span>
          <ChevronDown className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2 rounded-2xl shadow-lg" align="start">
        <div className="space-y-1">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onModelSelect(model.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                selectedModel === model.id
                  ? "bg-gray-200 dark:bg-gray-700 text-black dark:text-white"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}
            >
              {model.name}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}