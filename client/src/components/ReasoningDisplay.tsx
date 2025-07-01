import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/prompt-kit/reasoning";

interface ReasoningDisplayProps {
  reasoning?: string;
  isStreaming?: boolean;
  className?: string;
}

export function ReasoningDisplay({ reasoning, isStreaming = false, className = "" }: ReasoningDisplayProps) {
  if (!reasoning && !isStreaming) return null;



  return (
    <div className={`${className} font-inter`}>
      <Reasoning isStreaming={isStreaming} defaultOpen={false}>
        <ReasoningTrigger>
          {isStreaming ? "AI myśli..." : "Myśli AI"}
        </ReasoningTrigger>
        <ReasoningContent
          markdown
          className=""
        >
          {reasoning}
        </ReasoningContent>
      </Reasoning>
    </div>
  );
}