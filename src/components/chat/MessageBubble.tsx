'use client'

import { Check, CheckCheck, Trash2, Reply } from 'lucide-react'
import { type MessageWithRelations, deleteMessage } from '@/lib/actions/messages'
import { toggleReaction } from '@/lib/actions/reactions'

interface MessageBubbleProps {
  message: MessageWithRelations
  currentUserId: string
  onReply: (message: MessageWithRelations) => void
}

type ReactionGroup = { emoji: string; count: number; reacted: boolean }

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '👏']

export function MessageBubble({ message, currentUserId, onReply }: MessageBubbleProps) {
  const isOwn = message.sender_id === currentUserId
  const isDeleted = message.deleted_at !== null

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

  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} group mb-1`}>
      {/* Имя отправителя (только для чужих сообщений) */}
      {!isOwn && (
        <span className="text-xs text-indigo-300 font-medium mb-0.5 ml-3">
          {message.sender.display_name}
        </span>
      )}

      {/* Строка с action-кнопками и пузырём */}
      <div className={`flex items-center gap-1 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Кнопки Reply и Delete — видны только при group-hover */}
        {!isDeleted && (
          <>
            <button
              onClick={() => onReply(message)}
              className="p-1 rounded text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Reply size={14} strokeWidth={1.5} />
            </button>
            {isOwn && (
              <button
                onClick={() => deleteMessage(message.id)}
                className="p-1 rounded text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            )}
          </>
        )}

        {/* Пузырь сообщения */}
        <div
          className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
            isOwn
              ? 'bg-indigo-600 text-white rounded-br-sm'
              : 'bg-[#1e2c3a] text-gray-100 rounded-bl-sm'
          }`}
        >
          {/* Reply цитата */}
          {message.reply && !isDeleted && (
            <div className="border-l-2 border-indigo-300 pl-2 mb-1.5 text-xs opacity-80">
              <span className="font-medium text-indigo-200">{message.reply.sender?.display_name ?? 'Пользователь'}</span>
              <p className="truncate text-gray-300">{message.reply.content}</p>
            </div>
          )}

          {/* Контент */}
          {isDeleted
            ? <span className="italic text-gray-400 text-xs">Сообщение удалено</span>
            : <span className="leading-relaxed whitespace-pre-wrap break-words">{message.content}</span>
          }

          {/* Время + статус прочтения */}
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
      </div>

      {/* Реакции под пузырём */}
      {groupedReactions.length > 0 && (
        <div className={`flex flex-wrap gap-1 mt-0.5 mb-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          {groupedReactions.map(({ emoji, count, reacted }) => (
            <button
              key={emoji}
              onClick={() => toggleReaction(message.id, emoji)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                reacted
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              {emoji} {count}
            </button>
          ))}
        </div>
      )}

      {/* Quick reaction picker — виден только при group-hover */}
      {!isDeleted && (
        <div className={`flex gap-0.5 mb-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'justify-end' : 'justify-start'}`}>
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => toggleReaction(message.id, emoji)}
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
