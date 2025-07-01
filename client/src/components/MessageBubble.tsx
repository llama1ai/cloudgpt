import React from 'react';
import { type Message as MessageType } from "@shared/schema";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/prompt-kit/message";

interface MessageBubbleProps {
  message: MessageType;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <Message className="justify-end mb-3">
        <div
          role="text"
          tabIndex={0}
          className={
            `inline-block rounded-full shadow-sm text-sm py-2 px-4 opacity-100
             bg-gray-100 dark:bg-gray-700 text-black dark:text-white
             max-w-[75%] sm:max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500`
          }
        >
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>
      </Message>
    );
  }

  return (
    <Message className="justify-start mb-3">
      <MessageContent className="bg-transparent p-0" markdown>
        {message.content}
      </MessageContent>
    </Message>
  );
}

export default MessageBubble;
