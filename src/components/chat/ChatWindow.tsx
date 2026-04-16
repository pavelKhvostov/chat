'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

type Profile = { id: string; display_name: string; avatar_url: string | null }

interface ChatWindowProps {
  groupId: string
  currentUserId: string
  currentUserName: string
  initialMessages: MessageWithRelations[]
  memberProfiles: Profile[]
}

export function ChatWindow({
  groupId,
  currentUserId,
  currentUserName,
  initialMessages,
  memberProfiles,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<MessageWithRelations[]>(initialMessages)
  const [hasMore, setHasMore] = useState(initialMessages.length === 50)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null)

  // Кеш профилей — заполняется с сервера, без клиентских запросов
  const profileCache = useRef<Map<string, Profile>>(new Map())

  useEffect(() => {
    // Профили участников группы (с сервера)
    memberProfiles.forEach((p) => profileCache.current.set(p.id, p))
    // Профили из сообщений
    initialMessages.forEach((m) => {
      if (m.sender) profileCache.current.set(m.sender_id, m.sender)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getProfile = useCallback((userId: string): Profile => {
    return profileCache.current.get(userId) ?? {
      id: userId,
      display_name: 'Участник',
      avatar_url: null,
    }
  }, [])

  // Realtime подписки
  useRealtime({
    groupId,
    onInsert: useCallback((msg) => {
      const sender = msg.sender_id === currentUserId
        ? { id: currentUserId, display_name: currentUserName, avatar_url: null }
        : getProfile(msg.sender_id)

      setMessages((prev) => {
        // Находим reply-цитату в существующих сообщениях
        const replyMsg = msg.reply_to ? prev.find((m) => m.id === msg.reply_to) : null
        const reply = replyMsg ? {
          id: replyMsg.id,
          content: replyMsg.content,
          sender: { display_name: replyMsg.sender?.display_name ?? 'Участник' },
        } : null

        if (msg.sender_id === currentUserId) {
          const withoutTemp = prev.filter(
            (m) => !(m.id.startsWith('temp-') && m.content === msg.content)
          )
          if (withoutTemp.some((m) => m.id === msg.id)) return withoutTemp
          return [...withoutTemp, { ...msg, sender, reply, reactions: [], reads: [] } as MessageWithRelations]
        } else {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, { ...msg, sender, reply, reactions: [], reads: [] } as MessageWithRelations]
        }
      })

      if (msg.sender_id !== currentUserId) {
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

    // ✓✓ обновляется в реальном времени когда другой пользователь прочитал
    onRead: useCallback(({ message_id, user_id }: { message_id: string; user_id: string }) => {
      if (user_id === currentUserId) return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message_id && !m.reads.some((r) => r.user_id === user_id)
            ? { ...m, reads: [...m.reads, { user_id }] }
            : m
        )
      )
    }, [currentUserId]),
  })

  const { typingUsers, setTyping } = useTyping(groupId, currentUserId, currentUserName)

  // Отметить как прочитанные при монтировании
  useEffect(() => {
    const ids = messages
      .filter((m) => m.sender_id !== currentUserId && !m.reads.some(r => r.user_id === currentUserId))
      .map((m) => m.id)
    if (ids.length > 0) markMessagesAsRead(ids)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    } catch {
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
          content: msg.content ?? '',
          senderName: msg.sender?.display_name ?? '',
        })}
      />

      {typingUsers.length > 0 && (
        <div className="px-4 py-1 flex items-center gap-1">
          <span className="text-xs text-white/40 italic">
            {typingUsers.length === 1
              ? `${typingUsers[0].displayName} печатает`
              : `${typingUsers.map(u => u.displayName).join(', ')} печатают`}
          </span>
          <span className="inline-flex gap-0.5 ml-0.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-1 h-1 bg-white/40 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
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
