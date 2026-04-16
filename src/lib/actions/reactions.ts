'use server'

import { createClient } from '@/lib/supabase/server'

export async function toggleReaction(messageId: string, emoji: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: existing, error: selectError } = await supabase
    .from('message_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .maybeSingle()

  if (selectError) throw selectError

  if (existing) {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('id', existing.id)

    if (error) throw error
  } else {
    const { error } = await supabase
      .from('message_reactions')
      .insert({ message_id: messageId, emoji, user_id: user.id })

    if (error) throw error
  }
}
