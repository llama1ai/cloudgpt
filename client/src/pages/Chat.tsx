import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Message, type ChatSession } from "@shared/schema";
import { MessageBubble } from "@/components/MessageBubble";
import { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction } from "@/components/PromptInput";
import { ReasoningDisplay } from "@/components/ReasoningDisplay";
import { Message as MessageComponent, MessageAvatar, MessageContent } from "@/components/prompt-kit/message";

import { NewSidebar } from "@/components/NewSidebar";

import { ModelSelector } from "@/components/ModelSelector";
import { Button } from "@/components/ui/button";
import { ArrowUp, Paperclip, Bot, Edit3, Lightbulb, Globe, Plus, Settings2, Send, X, Mic, ImageIcon, Menu } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";




// Landing page tools list
const toolsList = [
  { id: 'createImage', name: 'Create an image', shortName: 'Image', icon: ImageIcon },
  { id: 'searchWeb', name: 'Search the web', shortName: 'Search', icon: Globe },
  { id: 'writeCode', name: 'Write or code', shortName: 'Write', icon: Edit3 },
  { id: 'deepResearch', name: 'Run deep research', shortName: 'Deep Search', icon: Lightbulb, extra: '5 left' },
  { id: 'thinkLonger', name: 'Think for longer', shortName: 'Think', icon: Lightbulb },
];

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  maxTokens: number;
}

export default function Chat() {
  const [inputValue, setInputValue] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("deepseek-r1");
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Landing page state
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", currentSessionId],
    queryFn: async () => {
      const url = currentSessionId ? `/api/messages?sessionId=${currentSessionId}` : '/api/messages';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    }
  });

  const { data: availableModels = [] } = useQuery<AIModel[]>({
    queryKey: ["/api/models"],
  });

  const { data: sessions = [] } = useQuery<ChatSession[]>({
    queryKey: ["/api/chat-sessions"],
  });

  // Auto-select the most recent session if none is selected
  useEffect(() => {
    if (!currentSessionId && sessions.length > 0) {
      const mostRecentSession = sessions.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];
      setCurrentSessionId(mostRecentSession.id);
    }
  }, [sessions, currentSessionId]);

  const [streamingReasoning, setStreamingReasoning] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreamingActive, setIsStreamingActive] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const controller = new AbortController();
      setAbortController(controller);
      setIsStreamingActive(true);
      setStreamingReasoning("");
      setStreamingContent("");

      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            role: "user",
            model: selectedModel,
            sessionId: currentSessionId,
          }),
          signal: controller.signal,
        });

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error("No reader available");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'reasoning') {
                  setStreamingReasoning(prev => prev + data.data);
                } else if (data.type === 'content') {
                  setStreamingContent(prev => prev + data.data);
                } else if (data.type === 'complete') {
                  setIsStreamingActive(false);
                  setStreamingReasoning("");
                  setStreamingContent("");
                  setAbortController(null);
                  // Don't invalidate - let UI show current state
                  return;
                } else if (data.type === 'assistantMessage') {
                  // AI message is complete, add to cache directly
                  console.log("Assistant message received:", data.data);
                  const currentMessages = queryClient.getQueryData<Message[]>(["/api/messages", currentSessionId]) || [];
                  queryClient.setQueryData(["/api/messages", currentSessionId], [...currentMessages, data.data]);
                  
                  // Clear streaming state with slight delay to prevent flickering
                  setTimeout(() => {
                    setIsStreamingActive(false);
                    setStreamingReasoning("");
                    setStreamingContent("");
                    setAbortController(null);
                  }, 100);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Request was aborted');
        } else {
          throw error;
        }
      }
    },
    onError: (error) => {
      console.error('Message sending error:', error);
      setIsStreamingActive(false);
      setStreamingReasoning("");
      setStreamingContent("");
      setAbortController(null);
      // No need to invalidate on error - let user retry
    },
  });

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsStreamingActive(false);
      setStreamingReasoning("");
      setStreamingContent("");
    }
  };

  // Landing page handlers
  const handlePlusClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    event.target.value = "";
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (inputValue.trim() && !sendMessageMutation.isPending) {
      const messageToSend = inputValue.trim();
      setInputValue(""); // Clear immediately
      setImagePreview(null); // Clear image
      setSelectedTool(null); // Clear tool
      
      // Add user message immediately to UI
      const userMessage = {
        id: Date.now(),
        content: messageToSend,
        role: "user" as const,
        reasoning: null,
        timestamp: new Date().toISOString()
      };
      
      queryClient.setQueryData(["/api/messages", currentSessionId], (old: any[]) => [...(old || []), userMessage]);
      sendMessageMutation.mutate(messageToSend);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreamingActive) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamingContent, streamingReasoning, isStreamingActive]);

  return (
    <>
      <NewSidebar 
        isOpen={sidebarOpen} 
        onOpenChange={setSidebarOpen}
        currentSessionId={currentSessionId}
        onSessionSelect={setCurrentSessionId}
      />
      <div className="flex h-full flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-transparent bg-white dark:bg-black px-4 py-3">
          <Button
            variant="ghost"
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-2 focus:ring-blue-500"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {availableModels.length > 0 && (
            <ModelSelector
              models={availableModels}
              selectedModel={selectedModel}
              onModelSelect={setSelectedModel}
            />
          )}
          
          <div></div> {/* Spacer */}
        </header>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl">
          <div className="space-y-4 p-4 sm:p-6">
            {/* Welcome Message */}
            {messages.length === 0 && !isLoading && (
              <>


                {/* Desktop Welcome - Simple Prompt Input */}
                <div className="hidden sm:flex flex-col items-center justify-center min-h-[60vh] font-inter">
                  <div className="w-full max-w-xl text-center space-y-8">
                    <p className="text-3xl text-gray-900 dark:text-white">
                      How can I help you today?
                    </p>
                    
                    {/* Desktop Landing Page Prompt Input */}
                    <PromptInput
                      value={inputValue}
                      onValueChange={setInputValue}
                      isLoading={sendMessageMutation.isPending}
                      onSubmit={handleSubmit}
                      className="font-inter"
                    >
                      <PromptInputTextarea placeholder="Message..." />
                      <PromptInputActions>
                        <div className="flex items-center space-x-2">
                          <PromptInputAction tooltip="Attach file">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-lg p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              disabled
                            >
                              <Paperclip className="h-4 w-4" />
                            </Button>
                          </PromptInputAction>
                        </div>

                        <div className="flex items-center space-x-2">
                          {isStreamingActive ? (
                            <Button
                              size="sm"
                              onClick={stopGeneration}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-black dark:bg-black text-white hover:bg-gray-800 dark:hover:bg-gray-700"
                              title="Stop generation"
                            >
                              <div className="w-3 h-3 bg-white dark:bg-white" style={{aspectRatio: '1/1'}} />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={handleSubmit}
                              disabled={!inputValue.trim() || sendMessageMutation.isPending}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500"
                              title="Send message"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </PromptInputActions>
                    </PromptInput>
                  </div>
                </div>
              </>
            )}

            {/* Messages */}
            {messages.map((message) => (
              <div key={message.id}>
                {/* Show reasoning ABOVE AI message */}
                {message.role === "assistant" && message.reasoning && (
                  <ReasoningDisplay reasoning={message.reasoning} className="mb-2" />
                )}
                <MessageBubble message={message} />
              </div>
            ))}
            
            {/* Live streaming reasoning and response */}
            {isStreamingActive && (
              <>
                {/* Streaming reasoning ABOVE content */}
                {streamingReasoning && (
                  <ReasoningDisplay 
                    reasoning={streamingReasoning} 
                    isStreaming={true} 
                    className="mb-2" 
                  />
                )}
                
                {/* Streaming content */}
                {streamingContent && (
                  <MessageComponent className="justify-start">
                    <MessageContent className="bg-transparent p-0" markdown>
                      {streamingContent}
                    </MessageContent>
                  </MessageComponent>
                )}
              </>
            )}

            {/* Loading indicator */}
            {sendMessageMutation.isPending && !isStreamingActive && (
              <MessageComponent className="justify-start">
                <MessageContent className="bg-transparent p-0">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div
                        className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="h-2 w-2 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">AI is typing...</span>
                  </div>
                </MessageContent>
              </MessageComponent>
            )}

            <div ref={messagesEndRef} />
          </div>
          </div>
        </div>

        {/* Message Input - Hide on desktop when no messages */}
        <div className={`bg-white dark:bg-gray-900 ${messages.length === 0 ? 'sm:hidden' : ''}`}>
          <div className="w-full sm:mx-auto sm:max-w-3xl">
            <PromptInput
              value={inputValue}
              onValueChange={setInputValue}
              isLoading={sendMessageMutation.isPending}
              onSubmit={handleSubmit}
            >
              <PromptInputTextarea placeholder="Message AI Assistant..." />
              <PromptInputActions>
                <div className="flex items-center space-x-2">
                  <PromptInputAction tooltip="Attach file">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      disabled
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </PromptInputAction>
                </div>

                <div className="flex items-center space-x-2">
                  {isStreamingActive ? (
                    <Button
                      size="sm"
                      onClick={stopGeneration}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black dark:bg-black text-white hover:bg-gray-800 dark:hover:bg-gray-700"
                      title="Stop generation"
                    >
                      <div className="w-3 h-3 bg-white dark:bg-white" style={{aspectRatio: '1/1'}} />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={!inputValue.trim() || sendMessageMutation.isPending}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500"
                      title="Send message"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </PromptInputActions>
            </PromptInput>
          </div>
        </div>
      </div>
    </>
  );
}
