'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { type MessageWithRelations } from '@/lib/actions/messages'
import { MessageBubble } from './MessageBubble'

interface MessageListProps {
  messages: MessageWithRelations[]
  currentUserId: string
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  onReply: (message: MessageWithRelations) => void
  onDelete: (id: string) => void
}

export function MessageList({
  messages,
  currentUserId,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onReply,
  onDelete,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)

  // IntersectionObserver для пагинации (скролл вверх)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          onLoadMore()
        }
      },
      { threshold: 0.1 }
    )
    if (topRef.current) observer.observe(topRef.current)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, onLoadMore])

  // Отслеживание позиции скролла
  const handleScroll = useCallback(() => {
    if (!listRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = listRef.current
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < 100)
  }, [])

  // Автоскролл вниз при новых сообщениях (только если пользователь внизу)
  useEffect(() => {
    if (isAtBottom) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      })
    }
  }, [messages.length, isAtBottom])

  return (
    <div
      ref={listRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5"
    >
      <div ref={topRef} className="h-1" />
      {isLoadingMore && (
        <div className="flex justify-center py-2">
          <div className="text-xs text-white/30">Загрузка...</div>
        </div>
      )}
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          currentUserId={currentUserId}
          onReply={onReply}
          onDelete={onDelete}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
