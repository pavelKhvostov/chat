'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Menu } from 'lucide-react'
import {
  type MessageWithRelations,
  fetchMessages,
  sendMessage,
  markMessagesAsRead,
} from '@/lib/actions/messages'
import { toggleReaction } from '@/lib/actions/reactions'
import { useRealtime } from '@/hooks/useRealtime'
import { useTyping } from '@/hooks/useTyping'
import { useSidebarDrawer } from '@/components/layout/ShellClient'
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
  const [attachmentError, setAttachmentError] = useState<string | null>(null)

  useEffect(() => {
    if (!attachmentError) return
    const id = setTimeout(() => setAttachmentError(null), 4000)
    return () => clearTimeout(id)
  }, [attachmentError])

  const profileCache = useRef<Map<string, Profile>>(new Map())

  useEffect(() => {
    memberProfiles.forEach((p) => profileCache.current.set(p.id, p))
    initialMessages.forEach((m) => {
      if (m.sender) profileCache.current.set(m.sender_id, m.sender)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const getProfile = useCallback((userId: string): Profile => {
    return profileCache.current.get(userId) ?? { id: userId, display_name: 'Участник', avatar_url: null }
  }, [])

  const { broadcastReaction } = useRealtime({
    groupId,
    onInsert: useCallback((msg) => {
      const sender = msg.sender_id === currentUserId
        ? { id: currentUserId, display_name: currentUserName, avatar_url: null }
        : getProfile(msg.sender_id)

      setMessages((prev) => {
        const replyMsg = msg.reply_to ? prev.find((m) => m.id === msg.reply_to) : null
        const reply = replyMsg ? {
          id: replyMsg.id, content: replyMsg.content,
          sender: { display_name: replyMsg.sender?.display_name ?? 'Участник' },
        } : null

        if (msg.sender_id === currentUserId) {
          let removed = false
          const withoutTemp = prev.filter((m) => {
            if (!removed && m.id.startsWith('temp-') && m.content === msg.content && m.sender_id === currentUserId) {
              removed = true
              return false
            }
            return true
          })
          if (withoutTemp.some((m) => m.id === msg.id)) return withoutTemp
          return [...withoutTemp, { ...msg, sender, reply, reactions: [], reads: [], attachments: [] } as MessageWithRelations]
        } else {
          if (prev.some((m) => m.id === msg.id)) return prev
          return [...prev, { ...msg, sender, reply, reactions: [], reads: [], attachments: [] } as MessageWithRelations]
        }
      })
      if (msg.sender_id !== currentUserId) markMessagesAsRead([msg.id])
    }, [currentUserId, currentUserName, getProfile]),

    onUpdate: useCallback((msg) => {
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, deleted_at: msg.deleted_at } : m))
    }, []),

    onDelete: useCallback((id) => {
      setMessages((prev) => prev.map((m) => m.id === id ? { ...m, deleted_at: new Date().toISOString() } : m))
    }, []),

    onReactionAdd: useCallback((reaction) => {
      setMessages((prev) => prev.map((m) => {
        if (m.id !== reaction.message_id) return m
        // Заменяем оптимистичную реакцию (opt-*) реальной, либо добавляем если нет дубля
        const withoutOptimistic = m.reactions.filter(
          (r) => !(r.user_id === reaction.user_id && r.emoji === reaction.emoji && r.id.startsWith('opt-'))
        )
        if (withoutOptimistic.some((r) => r.id === reaction.id)) return { ...m, reactions: withoutOptimistic }
        return { ...m, reactions: [...withoutOptimistic, reaction] }
      }))
    }, []),

    onReactionRemove: useCallback((reaction) => {
      setMessages((prev) => prev.map((m) => {
        if (m.id !== reaction.message_id) return m
        return { ...m, reactions: m.reactions.filter((r) => !(r.emoji === reaction.emoji && r.user_id === reaction.user_id)) }
      }))
    }, []),
  })

  const { typingUsers, setTyping } = useTyping(groupId, currentUserId, currentUserName)

  useEffect(() => {
    const ids = messages
      .filter((m) => m.sender_id !== currentUserId && !m.reads.some(r => r.user_id === currentUserId))
      .map((m) => m.id)
    if (ids.length > 0) markMessagesAsRead(ids)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { toggle: toggleSidebar } = useSidebarDrawer()

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

  const handleDelete = useCallback((id: string) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, deleted_at: new Date().toISOString() } : m))
  }, [])

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    const tempId = `opt-${Date.now()}`
    let wasRemove = false

    setMessages((prev) => prev.map((m) => {
      if (m.id !== messageId) return m
      const alreadyReacted = m.reactions.some((r) => r.emoji === emoji && r.user_id === currentUserId)
      wasRemove = alreadyReacted
      if (alreadyReacted) {
        return { ...m, reactions: m.reactions.filter((r) => !(r.emoji === emoji && r.user_id === currentUserId)) }
      } else {
        const fakeReaction = { id: tempId, message_id: messageId, emoji, user_id: currentUserId, created_at: new Date().toISOString() }
        return { ...m, reactions: [...m.reactions, fakeReaction] }
      }
    }))

    try {
      const result = await toggleReaction(messageId, emoji)
      if (result.action === 'added') {
        // Заменяем opt- реальной реакцией
        setMessages((prev) => prev.map((m) => {
          if (m.id !== messageId) return m
          return { ...m, reactions: m.reactions.map((r) => r.id === tempId ? result.reaction : r) }
        }))
        broadcastReaction('reaction_add', result.reaction)
      } else {
        broadcastReaction('reaction_remove', { id: result.reaction.id, message_id: messageId, emoji, user_id: currentUserId })
      }
    } catch {
      // Откат при ошибке
      setMessages((prev) => prev.map((m) => {
        if (m.id !== messageId) return m
        if (wasRemove) {
          return m // состояние уже без реакции, оставляем
        }
        return { ...m, reactions: m.reactions.filter((r) => r.id !== tempId) }
      }))
    }
  }, [currentUserId, broadcastReaction])

  const handleSend = useCallback(async (text: string, replyToId?: string) => {
    const tempId = `temp-${Date.now()}`
    const optimisticMsg: MessageWithRelations = {
      id: tempId, group_id: groupId, sender_id: currentUserId, content: text,
      reply_to: replyToId ?? null, deleted_at: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      sender: { id: currentUserId, display_name: currentUserName, avatar_url: null },
      reply: replyTo && replyToId ? { id: replyToId, content: replyTo.content, sender: { display_name: replyTo.senderName } } : null,
      reactions: [], reads: [], attachments: [],
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
    <div className="flex flex-1 flex-col overflow-hidden bg-brand-bg">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="Открыть меню"
        className="md:hidden flex items-center justify-center min-h-[44px] min-w-[44px] mx-2 mt-2 self-start rounded-xl text-brand-text-muted hover:text-brand-primary hover:bg-brand-primary-soft transition-colors"
      >
        <Menu size={22} strokeWidth={1.75} />
      </button>
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
        onDelete={handleDelete}
        onReaction={handleReaction}
        onReply={(msg) => {
          if (!msg.id.startsWith('temp-')) {
            setReplyTo({
              id: msg.id,
              content: msg.content ?? '',
              senderName: msg.sender?.display_name ?? '',
            })
          }
        }}
      />

      {typingUsers.length > 0 && (
        <div className="px-5 py-1 flex items-center gap-1">
          <span className="text-xs text-brand-text-muted italic">
            {typingUsers.length === 1
              ? `${typingUsers[0].displayName} печатает`
              : `${typingUsers.map(u => u.displayName).join(', ')} печатают`}
          </span>
          <span className="inline-flex gap-0.5 ml-0.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-1 h-1 bg-brand-primary rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
        </div>
      )}

      {attachmentError && (
        <div className="px-4 pb-1">
          <div className="rounded-2xl bg-red-500/10 text-red-600 text-xs px-4 py-2 border border-red-500/20">
            {attachmentError}
          </div>
        </div>
      )}

      <MessageInput
        groupId={groupId}
        onSend={handleSend}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onTyping={setTyping}
        onAttachmentError={setAttachmentError}
      />
    </div>
  )
}
