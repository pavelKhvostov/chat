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
  onRead: (read: RealtimeRead) => void
}

export function useRealtime({ groupId, onInsert, onUpdate, onDelete, onRead }: UseRealtimeOptions): void {
  const onInsertRef = useRef(onInsert)
  const onUpdateRef = useRef(onUpdate)
  const onDeleteRef = useRef(onDelete)
  const onReadRef = useRef(onRead)
  onInsertRef.current = onInsert
  onUpdateRef.current = onUpdate
  onDeleteRef.current = onDelete
  onReadRef.current = onRead

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`group:${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (payload) => onInsertRef.current(payload.new as RealtimeMessage)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (payload) => onUpdateRef.current(payload.new as RealtimeMessage)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (payload) => onDeleteRef.current((payload.old as { id: string }).id)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reads' },
        (payload) => onReadRef.current(payload.new as RealtimeRead)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId])
}
