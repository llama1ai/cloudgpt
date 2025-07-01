"use client"

import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MessageProps {
  children: React.ReactNode
  className?: string
}

interface MessageAvatarProps {
  src?: string
  alt?: string
  fallback?: string
  className?: string
}

interface MessageContentProps {
  children: React.ReactNode
  markdown?: boolean
  className?: string
}

export function Message({ children, className }: MessageProps) {
  return (
    <div className={cn("flex items-start gap-2 sm:gap-3 max-w-full", className)}>
      {children}
    </div>
  )
}

export function MessageAvatar({ src, alt, fallback, className }: MessageAvatarProps) {
  return (
    <div className={cn("flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300", className)}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full rounded-full object-cover" />
      ) : (
        fallback || "AI"
      )}
    </div>
  )
}

export function MessageContent({ children, markdown = false, className }: MessageContentProps) {
  const baseClasses = "space-y-2 overflow-hidden rounded-lg p-2 sm:p-3 text-sm max-w-[85vw] sm:max-w-md lg:max-w-lg"
  const defaultClasses = "bg-gray-50 dark:bg-gray-800"
  
  return (
    <div className={cn(baseClasses, className || defaultClasses)}>
      {typeof children === 'string' ? (
        markdown ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({children}) => <h1 className="text-base font-semibold mb-2 text-gray-900 dark:text-gray-100">{children}</h1>,
                h2: ({children}) => <h2 className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">{children}</h2>,
                h3: ({children}) => <h3 className="text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">{children}</h3>,
                p: ({children}) => <p className="mb-2 text-gray-700 dark:text-gray-300 leading-relaxed">{children}</p>,
                code: ({children}) => <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs font-mono text-gray-800 dark:text-gray-200">{children}</code>,
                pre: ({children}) => <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs font-mono overflow-x-auto mb-2 border">{children}</pre>,
                ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                li: ({children}) => <li className="text-gray-700 dark:text-gray-300">{children}</li>,
                strong: ({children}) => <strong className="font-medium text-gray-900 dark:text-gray-100">{children}</strong>,
                em: ({children}) => <em className="italic text-gray-600 dark:text-gray-400">{children}</em>,
              }}
            >
              {String(children)}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words">{children}</div>
        )
      ) : (
        children
      )}
    </div>
  )
}