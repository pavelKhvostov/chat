'use client'

import { useState, useRef } from 'react'
import { X, Send } from 'lucide-react'

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
      // Сброс высоты textarea
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
    <div className="flex-shrink-0 border-t border-white/[0.06] bg-[#17212b] px-4 py-3">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-xl bg-white/5 border-l-2 border-indigo-400">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-indigo-300 font-medium">{replyTo.senderName}</p>
            <p className="text-xs text-gray-400 truncate">{replyTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="text-white/30 hover:text-white/60 flex-shrink-0"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-3">
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Сообщение..."
          rows={1}
          disabled={isSending}
          className="flex-1 resize-none bg-white/[0.06] text-white/90 placeholder-white/25 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 min-h-[42px] max-h-[120px] leading-relaxed"
          style={{ height: 'auto' }}
          onInput={(e) => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || isSending}
          className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white disabled:opacity-40 hover:bg-indigo-500 transition-colors duration-150"
        >
          <Send size={16} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  )
}
