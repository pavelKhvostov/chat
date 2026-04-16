'use client'

import { useState } from 'react'
import { Check, CheckCheck, Trash2, Reply } from 'lucide-react'
import { type MessageWithRelations, deleteMessage } from '@/lib/actions/messages'
import { toggleReaction } from '@/lib/actions/reactions'

interface MessageBubbleProps {
  message: MessageWithRelations
  currentUserId: string
  onReply: (message: MessageWithRelations) => void
  onDelete: (id: string) => void
}

type ReactionGroup = { emoji: string; count: number; reacted: boolean }

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '👏']

export function MessageBubble({ message, currentUserId, onReply, onDelete }: MessageBubbleProps) {
  const isOwn = message.sender_id === currentUserId
  const isDeleted = message.deleted_at !== null

  // Оптимистичные реакции — локальный оверрайд до прихода Realtime
  const [optimisticReactions, setOptimisticReactions] = useState<typeof message.reactions | null>(null)
  const reactions = optimisticReactions ?? message.reactions

  const groupedReactions: ReactionGroup[] = reactions.reduce<ReactionGroup[]>((acc, r) => {
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

  const handleReaction = async (emoji: string) => {
    const alreadyReacted = reactions.some(r => r.emoji === emoji && r.user_id === currentUserId)
    if (alreadyReacted) {
      setOptimisticReactions(reactions.filter(r => !(r.emoji === emoji && r.user_id === currentUserId)))
    } else {
      const fakeReaction = { id: `opt-${Date.now()}`, message_id: message.id, emoji, user_id: currentUserId, created_at: new Date().toISOString() }
      setOptimisticReactions([...reactions, fakeReaction])
    }
    await toggleReaction(message.id, emoji)
    setOptimisticReactions(null) // передаём управление Realtime
  }

  const handleDelete = () => {
    onDelete(message.id)
    deleteMessage(message.id)
  }

  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} group mb-1`}>
      {/* Имя отправителя (только для чужих) */}
      {!isOwn && (
        <span className="text-xs text-indigo-300 font-medium mb-0.5 ml-3">
          {message.sender?.display_name}
        </span>
      )}

      {/* Ряд: кнопки + пузырь */}
      <div className={`flex items-center gap-1 mb-0.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Пузырь */}
        <div className={`max-w-[72%] px-3 py-2 rounded-2xl text-sm ${
          isOwn ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-[#1e2c3a] text-gray-100 rounded-bl-sm'
        }`}>
          {message.reply && !isDeleted && (
            <div className="border-l-2 border-indigo-400/60 pl-2 mb-1.5 text-xs opacity-80">
              <p className="truncate text-white/70">{message.reply.content}</p>
            </div>
          )}
          {isDeleted
            ? <span className="italic text-white/30 text-xs">Сообщение удалено</span>
            : <span className="leading-relaxed whitespace-pre-wrap break-words">{message.content}</span>
          }
          <div className="flex items-center justify-end gap-1 mt-0.5">
            <span className="font-mono text-[10px] opacity-50">
              {new Date(message.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isOwn && !isDeleted && (
              isRead
                ? <CheckCheck size={12} strokeWidth={2} className="text-indigo-300 flex-shrink-0" />
                : <Check size={12} strokeWidth={2} className="text-white/40 flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Кнопки — в ряду, без layout shift через opacity */}
        {!isDeleted && (
          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onReply(message)}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
            >
              <Reply size={13} strokeWidth={1.5} />
            </button>
            {isOwn && (
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-full hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} strokeWidth={1.5} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Реакции */}
      {groupedReactions.length > 0 && (
        <div className={`flex flex-wrap gap-1 mt-0.5 mb-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          {groupedReactions.map(({ emoji, count, reacted }) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                reacted ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              {emoji} {count}
            </button>
          ))}
        </div>
      )}

      {/* Quick picker */}
      {!isDeleted && (
        <div className={`flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'justify-end' : 'justify-start'}`}>
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-sm transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
