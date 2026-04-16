'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Tables } from '@/lib/types/database.types'

type RealtimeMessage = Tables<'messages'>

interface UseRealtimeOptions {
  groupId: string
  onInsert: (msg: RealtimeMessage) => void
  onUpdate: (msg: RealtimeMessage) => void
  onDelete: (id: string) => void
}

export function useRealtime({ groupId, onInsert, onUpdate, onDelete }: UseRealtimeOptions): void {
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel(`group:${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          onInsert(payload.new as RealtimeMessage)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          onUpdate(payload.new as RealtimeMessage)
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          onDelete((payload.old as { id: string }).id)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId]) // eslint-disable-line react-hooks/exhaustive-deps
}
