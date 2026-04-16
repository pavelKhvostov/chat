'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  type MessageWithRelations,
  fetchMessages,
  sendMessage,
  markMessagesAsRead,
} from '@/lib/actions/messages'
import { useRealtime } from '@/hooks/useRealtime'
import { useTyping } from '@/hooks/useTyping'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'

interface ReplyTarget {
  id: string
  content: string
  senderName: string
}

interface ChatWindowProps {
  groupId: string
  currentUserId: string
  currentUserName: string
  initialMessages: MessageWithRelations[]
}

export function ChatWindow({
  groupId,
  currentUserId,
  currentUserName,
  initialMessages,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<MessageWithRelations[]>(initialMessages)
  const [hasMore, setHasMore] = useState(initialMessages.length === 50)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null)

  // Realtime подписки
  useRealtime({
    groupId,
    onInsert: useCallback((msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        const enriched: MessageWithRelations = {
          ...msg,
          sender: { id: msg.sender_id, display_name: 'Загрузка...', avatar_url: null },
          reply: null,
          reactions: [],
          reads: [],
        }
        return [...prev, enriched]
      })
    }, []),
    onUpdate: useCallback((msg) => {
      setMessages((prev) =>
        prev.map((m) => m.id === msg.id ? { ...m, ...msg } : m)
      )
    }, []),
    onDelete: useCallback((id) => {
      setMessages((prev) =>
        prev.map((m) => m.id === id ? { ...m, deleted_at: new Date().toISOString() } : m)
      )
    }, []),
  })

  // Typing indicator
  const { typingUsers, setTyping } = useTyping(groupId, currentUserId, currentUserName)

  // Отметить как прочитанные при монтировании
  useEffect(() => {
    const ids = messages
      .filter((m) => m.sender_id !== currentUserId && !m.reads.some(r => r.user_id === currentUserId))
      .map((m) => m.id)
    if (ids.length > 0) {
      markMessagesAsRead(ids)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Загрузка старых сообщений (пагинация)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const cursor = messages[0]?.created_at
      const older = await fetchMessages(groupId, cursor)
      setMessages((prev) => [...older, ...prev])
      if (older.length < 50) setHasMore(false)
    } finally {
      setIsLoadingMore(false)
    }
  }, [groupId, isLoadingMore, hasMore, messages])

  // Отправка сообщения
  const handleSend = async (text: string, replyToId?: string) => {
    await sendMessage(groupId, text, replyToId)
    // Не добавляем оптимистично — ждём Realtime INSERT
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#0f0f1a]">
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
        onReply={(msg) => setReplyTo({
          id: msg.id,
          content: msg.content,
          senderName: msg.sender.display_name,
        })}
      />

      {/* Typing indicator над инпутом */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 flex items-center gap-1">
          <span className="text-xs text-white/40 italic">
            {typingUsers.length === 1
              ? `${typingUsers[0].displayName} печатает`
              : `${typingUsers.map(u => u.displayName).join(', ')} печатают`}
          </span>
          <span className="inline-flex gap-0.5 ml-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1 h-1 bg-white/40 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        </div>
      )}

      <MessageInput
        groupId={groupId}
        onSend={handleSend}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onTyping={setTyping}
      />
    </div>
  )
}
