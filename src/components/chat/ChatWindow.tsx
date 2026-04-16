'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  type MessageWithRelations,
  fetchMessages,
  sendMessage,
  markMessagesAsRead,
} from '@/lib/actions/messages'
import { createClient } from '@/lib/supabase/client'
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

  // Кеш профилей чтобы Realtime-сообщения имели имя отправителя
  const profileCache = useRef<Map<string, { id: string; display_name: string; avatar_url: string | null }>>(new Map())

  // Предзаполняем кеш из initialMessages
  useEffect(() => {
    initialMessages.forEach((m) => {
      if (m.sender) profileCache.current.set(m.sender_id, m.sender)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Получить профиль из кеша или запросить из Supabase
  const getProfile = useCallback(async (userId: string) => {
    if (profileCache.current.has(userId)) return profileCache.current.get(userId)!
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', userId)
      .single()
    if (data) {
      profileCache.current.set(userId, data)
      return data
    }
    return { id: userId, display_name: 'Пользователь', avatar_url: null }
  }, [])

  // Realtime подписки
  useRealtime({
    groupId,
    onInsert: useCallback(async (msg) => {
      // Для своих сообщений — убираем temp-оптимистичное и добавляем реальное
      if (msg.sender_id === currentUserId) {
        const sender = { id: currentUserId, display_name: currentUserName, avatar_url: null }
        setMessages((prev) => {
          // Удаляем temp-сообщение с тем же content
          const withoutTemp = prev.filter(
            (m) => !(m.id.startsWith('temp-') && m.content === msg.content)
          )
          // Если уже есть реальное — не дублируем
          if (withoutTemp.some((m) => m.id === msg.id)) return withoutTemp
          return [...withoutTemp, { ...msg, sender, reply: null, reactions: [], reads: [] } as MessageWithRelations]
        })
      } else {
        // Для чужих — получаем профиль из кеша/Supabase
        const sender = await getProfile(msg.sender_id)
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, { ...msg, sender, reply: null, reactions: [], reads: [] } as MessageWithRelations]
        })
        // Отмечаем как прочитанное
        markMessagesAsRead([msg.id])
      }
    }, [currentUserId, currentUserName, getProfile]),

    onUpdate: useCallback((msg) => {
      setMessages((prev) =>
        prev.map((m) => m.id === msg.id ? { ...m, deleted_at: msg.deleted_at } : m)
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
    if (ids.length > 0) markMessagesAsRead(ids)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Загрузка старых сообщений (пагинация)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    try {
      const cursor = messages[0]?.created_at
      const older = await fetchMessages(groupId, cursor)
      older.forEach((m) => { if (m.sender) profileCache.current.set(m.sender_id, m.sender) })
      setMessages((prev) => [...older, ...prev])
      if (older.length < 50) setHasMore(false)
    } finally {
      setIsLoadingMore(false)
    }
  }, [groupId, isLoadingMore, hasMore, messages])

  // Отправка с оптимистичным UI
  const handleSend = useCallback(async (text: string, replyToId?: string) => {
    const tempId = `temp-${Date.now()}`

    const optimisticMsg: MessageWithRelations = {
      id: tempId,
      group_id: groupId,
      sender_id: currentUserId,
      content: text,
      reply_to: replyToId ?? null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: { id: currentUserId, display_name: currentUserName, avatar_url: null },
      reply: replyTo && replyToId ? {
        id: replyToId,
        content: replyTo.content,
        sender: { display_name: replyTo.senderName },
      } : null,
      reactions: [],
      reads: [],
    }

    setMessages((prev) => [...prev, optimisticMsg])
    setReplyTo(null)

    try {
      await sendMessage(groupId, text, replyToId)
      // Realtime INSERT заменит temp-сообщение
    } catch {
      // Откатываем при ошибке
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    }
  }, [groupId, currentUserId, currentUserName, replyTo])

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

      {/* Typing indicator */}
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
