'use server'

import { createClient } from '@/lib/supabase/server'
import { type Tables } from '@/lib/types/database.types'

type Reaction = Tables<'message_reactions'>

export async function toggleReaction(
  messageId: string,
  emoji: string
): Promise<{ action: 'added' | 'removed'; reaction: Reaction }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: existing } = await supabase
    .from('message_reactions')
    .select()
    .eq('message_id', messageId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .maybeSingle()

  if (existing) {
    await supabase.from('message_reactions').delete().eq('id', existing.id)
    return { action: 'removed', reaction: existing }
  } else {
    const { data, error } = await supabase
      .from('message_reactions')
      .insert({ message_id: messageId, emoji, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    return { action: 'added', reaction: data }
  }
}
