"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface PromptInputContextType {
  value: string
  onValueChange: (value: string) => void
  isLoading: boolean
  onSubmit: () => void
}

const PromptInputContext = React.createContext<PromptInputContextType | undefined>(undefined)

function usePromptInput() {
  const context = React.useContext(PromptInputContext)
  if (!context) {
    throw new Error("usePromptInput must be used within a PromptInput")
  }
  return context
}

interface PromptInputProps {
  value: string
  onValueChange: (value: string) => void
  isLoading: boolean
  onSubmit: () => void
  className?: string
  children: React.ReactNode
}

export function PromptInput({ value, onValueChange, isLoading, onSubmit, className, children }: PromptInputProps) {
  const [isFocused, setIsFocused] = React.useState(false)

  return (
    <PromptInputContext.Provider value={{ value, onValueChange, isLoading, onSubmit }}>
      <div
        className={cn(
          "relative bg-white dark:bg-gray-800 transition-all duration-200 ease-out",
          // Mobile - zaokrąglone tylko górne krawędzie, bez dolnych i bocznych krawędzi
          "rounded-t-3xl sm:rounded-3xl",
          // Mobile - tylko górne obramowanie (bez dolnych i bocznych) + cień od góry
          "border-t border-gray-200/40 dark:border-gray-600/40 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.3)]",
          // Desktop - pełne obramowanie
          "sm:border sm:border-gray-200/60 sm:dark:border-gray-600/60 sm:shadow-sm sm:hover:shadow-md",
          // Focus state
          isFocused && [
            // Mobile focus - tylko górne obramowanie
            "border-t-gray-300/60 dark:border-t-gray-500/60",
            // Desktop focus - pełne obramowanie
            "sm:border-gray-300/80 sm:dark:border-gray-500/80",
            // Lekko zwiększony cień przy focus tylko na desktop
            "sm:shadow-md",
          ],
          className,
        )}
        onFocusCapture={() => setIsFocused(true)}
        onBlurCapture={() => setIsFocused(false)}
      >
        {children}
      </div>
    </PromptInputContext.Provider>
  )
}

interface PromptInputTextareaProps {
  placeholder?: string
  className?: string
}

export function PromptInputTextarea({ placeholder, className }: PromptInputTextareaProps) {
  const { value, onValueChange, isLoading, onSubmit } = usePromptInput()
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [])

  React.useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !isLoading) {
        onSubmit()
      }
    }
  }

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={isLoading}
      className={cn(
        "w-full resize-none border-0 bg-transparent px-3 sm:px-4 py-3 sm:py-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-base",
        "min-h-[52px] sm:min-h-[56px] max-h-[200px]",
        // Brak widocznych ramek po kliknięciu
        "focus:ring-0 focus:border-0",
        // Zapobieganie zoom na iOS
        "text-[16px]",
        className,
      )}
      rows={1}
    />
  )
}

interface PromptInputActionsProps {
  className?: string
  children: React.ReactNode
}

export function PromptInputActions({ className, children }: PromptInputActionsProps) {
  return <div className={cn("flex items-center justify-between px-3 pb-3", className)}>{children}</div>
}

interface PromptInputActionProps {
  tooltip?: string
  children: React.ReactNode
}

export function PromptInputAction({ tooltip, children }: PromptInputActionProps) {
  return (
    <div className="relative" title={tooltip}>
      {children}
    </div>
  )
}
