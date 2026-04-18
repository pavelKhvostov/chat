'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, CheckCheck, Trash2, Reply, SmilePlus } from 'lucide-react'
import { type MessageWithRelations, deleteMessage } from '@/lib/actions/messages'
import { AttachmentRenderer } from './attachments/AttachmentRenderer'

interface MessageBubbleProps {
  message: MessageWithRelations
  currentUserId: string
  onReply: (message: MessageWithRelations) => void
  onDelete: (id: string) => void
  onReaction: (messageId: string, emoji: string) => void
}

type ReactionGroup = { emoji: string; count: number; reacted: boolean }

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '👏']

export function MessageBubble({ message, currentUserId, onReply, onDelete, onReaction }: MessageBubbleProps) {
  const isOwn = message.sender_id === currentUserId
  const isDeleted = message.deleted_at !== null

  const [pickerOpen, setPickerOpen] = useState(false)
  const lastTapRef = useRef<number>(0)
  const pickerWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!pickerOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!pickerWrapRef.current?.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [pickerOpen])

  const groupedReactions: ReactionGroup[] = message.reactions.reduce<ReactionGroup[]>((acc, r) => {
    const existing = acc.find(g => g.emoji === r.emoji)
    if (existing) {
      existing.count++
      if (r.user_id === currentUserId) existing.reacted = true
    } else {
      acc.push({ emoji: r.emoji, count: 1, reacted: r.user_id === currentUserId })
    }
    return acc
  }, [])

  const isRead = message.reads.some((r) => r.user_id !== currentUserId)

  const handleDelete = () => {
    onDelete(message.id)
    deleteMessage(message.id)
  }

  const handleBubbleDoubleClick = () => {
    if (isDeleted || message.id.startsWith('temp-')) return
    onReaction(message.id, '❤️')
  }

  // Touch: double-tap (<300ms) → ❤️
  const handleTouchEnd = () => {
    if (isDeleted || message.id.startsWith('temp-')) return
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      onReaction(message.id, '❤️')
      lastTapRef.current = 0
    } else {
      lastTapRef.current = now
    }
  }

  const pickReaction = (emoji: string) => {
    onReaction(message.id, emoji)
    setPickerOpen(false)
  }

  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} group mb-2`}>
      {/* Имя отправителя */}
      {!isOwn && (
        <span className="text-[12px] text-coral-600 font-bold mb-1 ml-4">
          {message.sender?.display_name}
        </span>
      )}

      {/* Ряд: пузырь + действия (fade-in без layout-shift) */}
      <div className={`flex items-center gap-1 w-full ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        <div
          onDoubleClick={handleBubbleDoubleClick}
          onTouchEnd={handleTouchEnd}
          className={`min-w-0 max-w-[75%] overflow-hidden px-[14px] py-[10px] rounded-md text-[15px] select-text ${
            isOwn
              ? 'bg-coral-500 text-white'
              : 'bg-ink-100 text-ink-900'
          }`}
        >
          {message.reply && !isDeleted && (
            <div className={`border-l-2 pl-2 mb-1.5 text-[13px] ${
              isOwn ? 'border-white/50 text-white/85' : 'border-coral-500/60 text-ink-500'
            }`}>
              <p className="truncate">{message.reply.content}</p>
            </div>
          )}
          {!isDeleted && message.attachments && message.attachments.length > 0 && (
            <div className={`flex flex-col gap-2 ${message.content ? 'mb-2' : ''}`}>
              {message.attachments.map((att) => (
                <AttachmentRenderer key={att.id} attachment={att} isOwn={isOwn} />
              ))}
            </div>
          )}
          {isDeleted
            ? <span className={`italic text-[13px] ${isOwn ? 'text-white/60' : 'text-ink-400'}`}>
                Сообщение удалено
              </span>
            : message.content
              ? <span className="leading-[1.5] break-all whitespace-pre-wrap">{message.content}</span>
              : null
          }
          <div className={`flex items-center justify-end gap-1 mt-1 ${
            isOwn ? 'text-white/75' : 'text-ink-400'
          }`}>
            <span className="font-mono text-[10px] font-num">
              {new Date(message.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isOwn && !isDeleted && (
              isRead
                ? <CheckCheck size={13} strokeWidth={2.25} className="text-white flex-shrink-0" />
                : <Check size={13} strokeWidth={2.25} className="text-white/70 flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Кнопки действий: fade-in без layout shift */}
        {!isDeleted && (
          <div
            ref={pickerWrapRef}
            className="relative flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150"
          >
            <button
              onClick={() => setPickerOpen((v) => !v)}
              aria-label="Добавить реакцию"
              className="p-1.5 rounded-full bg-surface shadow-sh-1 text-ink-500 hover:text-coral-500 transition-colors"
            >
              <SmilePlus size={14} strokeWidth={1.75} />
            </button>
            <button
              onClick={() => onReply(message)}
              aria-label="Ответить"
              className="p-1.5 rounded-full bg-surface shadow-sh-1 text-ink-500 hover:text-coral-500 transition-colors"
            >
              <Reply size={14} strokeWidth={1.75} />
            </button>
            {isOwn && (
              <button
                onClick={handleDelete}
                aria-label="Удалить"
                className="p-1.5 rounded-full bg-surface shadow-sh-1 text-ink-500 hover:text-rose-500 transition-colors"
              >
                <Trash2 size={14} strokeWidth={1.75} />
              </button>
            )}

            {/* Reaction picker popover */}
            {pickerOpen && (
              <div
                className={`absolute z-20 top-full mt-1 flex gap-1 p-1.5 rounded-pill bg-surface shadow-sh-2 border border-stroke ${
                  isOwn ? 'right-0' : 'left-0'
                }`}
              >
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => pickReaction(emoji)}
                    className="w-8 h-8 rounded-full hover:bg-ink-50 flex items-center justify-center text-[18px] transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Реакции */}
      {groupedReactions.length > 0 && (
        <div className={`flex flex-wrap gap-1 mt-1.5 ${isOwn ? 'justify-end' : 'justify-start ml-4'}`}>
          {groupedReactions.map(({ emoji, count, reacted }) => (
            <button
              key={emoji}
              onClick={() => onReaction(message.id, emoji)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors ${
                reacted
                  ? 'bg-coral-500 text-white'
                  : 'bg-surface text-ink-500 shadow-sh-1 hover:bg-coral-100'
              }`}
            >
              {emoji} <span className="font-semibold">{count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
