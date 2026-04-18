'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Tables } from '@/lib/types/database.types'

type RealtimeMessage = Tables<'messages'>
type RealtimeReaction = Tables<'message_reactions'>
type RealtimeAttachment = Tables<'message_attachments'>

interface UseRealtimeOptions {
  groupId: string
  onInsert: (msg: RealtimeMessage) => void
  onUpdate: (msg: RealtimeMessage) => void
  onDelete: (id: string) => void
  onReactionAdd: (reaction: RealtimeReaction) => void
  onReactionRemove: (reaction: Pick<RealtimeReaction, 'id' | 'message_id' | 'emoji' | 'user_id'>) => void
  onAttachmentInsert?: (attachment: RealtimeAttachment) => void
}

export function useRealtime(options: UseRealtimeOptions): {
  broadcastReaction: (event: 'reaction_add' | 'reaction_remove', payload: object) => void
} {
  const refs = useRef(options)
  refs.current = options

  const reactionChannelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  // Канал 1: postgres_changes для сообщений и вложений
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
      // message_attachments: без group_id фильтра (таблица не имеет его), ChatWindow проверит что message_id принадлежит текущей группе
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_attachments' },
        (p) => refs.current.onAttachmentInsert?.(p.new as RealtimeAttachment))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.groupId])

  // Канал 2: broadcast для реакций
  useEffect(() => {
    const supabase = createClient()
    const { groupId } = refs.current

    const channel = supabase
      .channel(`group:${groupId}:reactions`)
      .on('broadcast', { event: 'reaction_add' }, ({ payload }) => {
        refs.current.onReactionAdd(payload as RealtimeReaction)
      })
      .on('broadcast', { event: 'reaction_remove' }, ({ payload }) => {
        refs.current.onReactionRemove(payload as Pick<RealtimeReaction, 'id' | 'message_id' | 'emoji' | 'user_id'>)
      })
      .subscribe()

    reactionChannelRef.current = channel

    return () => {
      reactionChannelRef.current = null
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.groupId])

  const broadcastReaction = useCallback((event: 'reaction_add' | 'reaction_remove', payload: object) => {
    reactionChannelRef.current?.send({ type: 'broadcast', event, payload })
  }, [])

  return { broadcastReaction }
}
