"use client"

import { useState, createContext, useContext } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface ReasoningContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  isStreaming?: boolean
}

const ReasoningContext = createContext<ReasoningContextType | null>(null)

interface ReasoningProps {
  children: React.ReactNode
  isStreaming?: boolean
  className?: string
  defaultOpen?: boolean
}

interface ReasoningTriggerProps {
  children: React.ReactNode
  className?: string
}

interface ReasoningContentProps {
  children: React.ReactNode
  className?: string
  markdown?: boolean
}

export function Reasoning({ children, isStreaming, className, defaultOpen = false }: ReasoningProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <ReasoningContext.Provider value={{ isOpen, setIsOpen, isStreaming }}>
      <div className={cn("w-full", className)}>
        {children}
      </div>
    </ReasoningContext.Provider>
  )
}

export function ReasoningTrigger({ children, className }: ReasoningTriggerProps) {
  const context = useContext(ReasoningContext)
  if (!context) throw new Error("ReasoningTrigger must be used within Reasoning")
  
  const { isOpen, setIsOpen } = context

  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className={cn("flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors", className)}
    >
      {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      {children}
    </button>
  )
}

export function ReasoningContent({ children, className, markdown = false }: ReasoningContentProps) {
  const context = useContext(ReasoningContext)
  if (!context) throw new Error("ReasoningContent must be used within Reasoning")
  
  const { isOpen } = context

  if (!isOpen) return null

  return (
    <div className={cn("mt-2 py-2 font-inter", className)}>
      <div className="text-xs text-gray-600 dark:text-gray-400 pl-3 border-l-2 border-gray-200 dark:border-gray-600">
        {markdown ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({children}) => <h1 className="text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">{children}</h1>,
                h2: ({children}) => <h2 className="text-xs font-medium mb-1 text-gray-800 dark:text-gray-200">{children}</h2>,
                h3: ({children}) => <h3 className="text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">{children}</h3>,
                p: ({children}) => <p className="mb-1 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{children}</p>,
                code: ({children}) => <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs font-mono text-gray-700 dark:text-gray-300">{children}</code>,
                pre: ({children}) => <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs font-mono overflow-x-auto mb-1 border">{children}</pre>,
                ul: ({children}) => <ul className="list-disc list-inside mb-1 space-y-0.5">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal list-inside mb-1 space-y-0.5">{children}</ol>,
                li: ({children}) => <li className="text-xs text-gray-600 dark:text-gray-400">{children}</li>,
                strong: ({children}) => <strong className="font-medium text-gray-700 dark:text-gray-300">{children}</strong>,
                em: ({children}) => <em className="italic text-gray-500 dark:text-gray-500">{children}</em>,
              }}
            >
              {String(children || '')}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="whitespace-pre-wrap leading-relaxed">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}