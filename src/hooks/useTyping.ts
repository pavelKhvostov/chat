'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TypingUser {
  userId: string
  displayName: string
}

export function useTyping(
  groupId: string,
  currentUserId: string,
  currentUserName: string
): { typingUsers: TypingUser[]; setTyping: (typing: boolean) => Promise<void> } {
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])

  useEffect(() => {
    const channel = supabase.channel(`typing:${groupId}`, {
      config: { presence: { key: currentUserId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ typing: boolean; displayName: string }>()
        const typing = Object.entries(state)
          .filter(([uid, presences]) => uid !== currentUserId && presences[0]?.typing)
          .map(([uid, presences]) => ({ userId: uid, displayName: presences[0].displayName }))
        setTypingUsers(typing)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      channelRef.current?.untrack()
      supabase.removeChannel(channel)
    }
  }, [groupId, currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  const setTyping = useCallback(
    async (typing: boolean) => {
      if (!channelRef.current) return
      await channelRef.current.track({ typing, displayName: currentUserName })
    },
    [currentUserName]
  )

  return { typingUsers, setTyping }
}
