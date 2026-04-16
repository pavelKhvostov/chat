'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Tables } from '@/lib/types/database.types'

type RealtimeMessage = Tables<'messages'>
type RealtimeRead = { message_id: string; user_id: string }
type RealtimeReaction = Tables<'message_reactions'>

interface UseRealtimeOptions {
  groupId: string
  onInsert: (msg: RealtimeMessage) => void
  onUpdate: (msg: RealtimeMessage) => void
  onDelete: (id: string) => void
  onRead: (read: RealtimeRead) => void
  onReactionAdd: (reaction: RealtimeReaction) => void
  onReactionRemove: (reaction: Pick<RealtimeReaction, 'id' | 'message_id' | 'emoji' | 'user_id'>) => void
}

export function useRealtime(options: UseRealtimeOptions): void {
  const refs = useRef(options)
  refs.current = options

  useEffect(() => {
    const supabase = createClient()
    const { groupId } = refs.current

    const channel = supabase
      .channel(`group:${groupId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (p) => refs.current.onInsert(p.new as RealtimeMessage))
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (p) => refs.current.onUpdate(p.new as RealtimeMessage))
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (p) => refs.current.onDelete((p.old as { id: string }).id))
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reads' },
        (p) => refs.current.onRead(p.new as RealtimeRead))
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_reactions' },
        (p) => refs.current.onReactionAdd(p.new as RealtimeReaction))
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'message_reactions' },
        (p) => refs.current.onReactionRemove(p.old as Pick<RealtimeReaction, 'id' | 'message_id' | 'emoji' | 'user_id'>))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.groupId])
}
