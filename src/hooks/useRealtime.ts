'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Tables } from '@/lib/types/database.types'

type RealtimeMessage = Tables<'messages'>
type RealtimeRead = { message_id: string; user_id: string }

interface UseRealtimeOptions {
  groupId: string
  onInsert: (msg: RealtimeMessage) => void
  onUpdate: (msg: RealtimeMessage) => void
  onDelete: (id: string) => void
  onRead?: (read: RealtimeRead) => void
}

export function useRealtime({ groupId, onInsert, onUpdate, onDelete, onRead }: UseRealtimeOptions): void {
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    // Убираем предыдущий канал если есть
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`group:${groupId}:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (payload) => onInsert(payload.new as RealtimeMessage)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (payload) => onUpdate(payload.new as RealtimeMessage)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (payload) => onDelete((payload.old as { id: string }).id)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reads' },
        (payload) => {
          if (onRead) onRead(payload.new as RealtimeRead)
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // Переподключаемся при ошибке
          setTimeout(() => {
            supabase.removeChannel(channel)
          }, 2000)
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [groupId]) // eslint-disable-line react-hooks/exhaustive-deps
}
