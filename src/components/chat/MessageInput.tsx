'use client'

import { useState, useRef } from 'react'
import { X, Send, Paperclip, Smile } from 'lucide-react'

interface ReplyTarget {
  id: string
  content: string
  senderName: string
}

interface MessageInputProps {
  groupId: string
  onSend: (text: string, replyToId?: string) => Promise<void>
  replyTo: ReplyTarget | null
  onCancelReply: () => void
  onTyping: (isTyping: boolean) => void
}

export function MessageInput({
  groupId: _groupId, // eslint-disable-line @typescript-eslint/no-unused-vars
  onSend,
  replyTo,
  onCancelReply,
  onTyping,
}: MessageInputProps) {
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    onTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => onTyping(false), 2000)
  }

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || isSending) return
    setIsSending(true)
    try {
      await onSend(trimmed, replyTo?.id)
      setText('')
      onCancelReply()
      onTyping(false)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
      }
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex-shrink-0 bg-brand-bg px-4 py-3">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3.5 py-2 rounded-2xl bg-brand-surface shadow-card border-l-4 border-brand-primary">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-brand-primary font-semibold">{replyTo.senderName}</p>
            <p className="text-xs text-brand-text-muted truncate">{replyTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="text-brand-text-muted hover:text-brand-text flex-shrink-0"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <div className="flex flex-1 items-end gap-2 bg-brand-surface shadow-card rounded-3xl pl-4 pr-2 py-1.5">
          <button
            type="button"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center text-brand-text-muted hover:text-brand-primary transition-colors"
            title="Прикрепить"
          >
            <Paperclip size={18} strokeWidth={1.75} />
          </button>
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение..."
            rows={1}
            disabled={isSending}
            className="flex-1 resize-none bg-transparent text-brand-text placeholder-brand-text-subtle text-sm focus:outline-none py-2 min-h-[38px] max-h-[120px] leading-relaxed"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`
            }}
          />
          <button
            type="button"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center text-brand-text-muted hover:text-brand-primary transition-colors"
            title="Эмодзи"
          >
            <Smile size={18} strokeWidth={1.75} />
          </button>
        </div>
        <button
          onClick={handleSend}
          disabled={!text.trim() || isSending}
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary text-white disabled:opacity-40 hover:bg-brand-primary-hover transition-colors duration-150 shadow-card"
        >
          <Send size={18} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}
