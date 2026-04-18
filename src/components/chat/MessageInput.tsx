'use client'

import { useRef, useState } from 'react'
import { X, Send, Paperclip, Smile } from 'lucide-react'
import { AttachmentPopup, type AttachmentPickType } from './attachments/AttachmentPopup'
import { VoiceRecorderButton } from './attachments/VoiceRecorderButton'
import { VideoCircleRecorder } from './attachments/VideoCircleRecorder'
import { uploadAttachment } from './attachments/uploadClient'

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
  onAttachmentError: (message: string) => void
}

type InputMode = 'text' | 'voice' | 'video'

export function MessageInput({
  groupId,
  onSend,
  replyTo,
  onCancelReply,
  onTyping,
  onAttachmentError,
}: MessageInputProps) {
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)
  const [mode, setMode] = useState<InputMode>('text')
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      if (inputRef.current) inputRef.current.style.height = 'auto'
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

  const handlePick = (type: AttachmentPickType) => {
    if (type === 'image') imageInputRef.current?.click()
    else if (type === 'file') fileInputRef.current?.click()
    else if (type === 'voice') setMode('voice')
    else if (type === 'video_circle') setMode('video')
  }

  const handleFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: 'image' | 'file'
  ) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    try {
      await uploadAttachment({
        file,
        fileName: file.name,
        fileType,
        groupId,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка загрузки'
      onAttachmentError(msg)
    }
  }

  return (
    <div className="flex-shrink-0 bg-surface border-t border-stroke px-4 py-3">
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(e) => { void handleFileSelected(e, 'image') }}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => { void handleFileSelected(e, 'file') }}
      />

      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3.5 py-2 rounded-2xl bg-surface shadow-sh-1 border-l-4 border-coral-500">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-coral-500 font-semibold">{replyTo.senderName}</p>
            <p className="text-xs text-ink-500 truncate">{replyTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="text-ink-500 hover:text-ink-900 flex-shrink-0"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
      )}

      {/* Mode: voice recording */}
      {mode === 'voice' && (
        <div className="flex items-center justify-between gap-3 px-2 py-2">
          <VoiceRecorderButton
            groupId={groupId}
            onUploaded={() => setMode('text')}
            onError={(msg) => {
              onAttachmentError(msg)
              setMode('text')
            }}
          />
          <button
            type="button"
            onClick={() => setMode('text')}
            aria-label="Отмена"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-500 hover:text-ink-900 hover:bg-coral-100 transition-colors"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
      )}

      {/* Mode: video recording (overlay is rendered by VideoCircleRecorder itself) */}
      {mode === 'video' && (
        <div className="flex items-center justify-between gap-3 px-2 py-2">
          <VideoCircleRecorder
            groupId={groupId}
            onUploaded={() => setMode('text')}
            onError={(msg) => {
              onAttachmentError(msg)
              setMode('text')
            }}
          />
          <button
            type="button"
            onClick={() => setMode('text')}
            aria-label="Отмена"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-500 hover:text-ink-900 hover:bg-coral-100 transition-colors"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
      )}

      {/* Mode: text (default) */}
      {mode === 'text' && (
        <div className="flex items-end gap-2">
          <div className="flex flex-1 items-end gap-2 bg-ink-50 rounded-pill pl-3 pr-2 py-1.5 border border-stroke">
            <div className="relative">
              <button
                type="button"
                onClick={() => setPopupOpen((v) => !v)}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center text-ink-500 hover:text-coral-500 transition-colors"
                aria-label="Прикрепить"
                aria-expanded={popupOpen}
                aria-haspopup="menu"
              >
                <Paperclip size={18} strokeWidth={1.75} />
              </button>
              <AttachmentPopup
                open={popupOpen}
                onClose={() => setPopupOpen(false)}
                onPick={handlePick}
              />
            </div>
            <textarea
              ref={inputRef}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Сообщение..."
              rows={1}
              disabled={isSending}
              className="flex-1 resize-none bg-transparent text-ink-900 placeholder-ink-400 text-sm focus:outline-none py-2 min-h-[38px] max-h-[120px] leading-relaxed"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`
              }}
            />
            <button
              type="button"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center text-ink-500 hover:text-coral-500 transition-colors"
              title="Эмодзи"
              aria-label="Эмодзи"
            >
              <Smile size={18} strokeWidth={1.75} />
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={!text.trim() || isSending}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-coral-500 text-white disabled:opacity-40 hover:bg-coral-600 transition-colors duration-150 shadow-sh-1"
            aria-label="Отправить"
          >
            <Send size={18} strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  )
}
