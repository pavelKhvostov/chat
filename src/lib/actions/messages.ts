'use server'

import { createClient } from '@/lib/supabase/server'
import { type Tables } from '@/lib/types/database.types'

export type MessageWithRelations = Tables<'messages'> & {
  sender: Pick<Tables<'profiles'>, 'id' | 'display_name' | 'avatar_url'>
  reply: (Pick<Tables<'messages'>, 'id' | 'content'> & {
    sender: Pick<Tables<'profiles'>, 'display_name'>
  }) | null
  reactions: Pick<Tables<'message_reactions'>, 'id' | 'emoji' | 'user_id'>[]
  reads: Pick<Tables<'message_reads'>, 'user_id'>[]
}

const PAGE_SIZE = 50

export async function fetchMessages(
  groupId: string,
  cursor?: string
): Promise<MessageWithRelations[]> {
  const supabase = await createClient()

  let query = supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!sender_id(id, display_name, avatar_url),
      reply:messages!reply_to(id, content, sender:profiles!sender_id(display_name)),
      reactions:message_reactions(id, emoji, user_id),
      reads:message_reads(user_id)
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  const { data, error } = await query

  if (error) throw error

  return ((data ?? []) as MessageWithRelations[]).reverse()
}

export async function sendMessage(
  groupId: string,
  content: string,
  replyTo?: string
): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('messages')
    .insert({
      group_id: groupId,
      content,
      sender_id: user.id,
      reply_to: replyTo ?? null,
    })

  if (error) throw error
}

export async function deleteMessage(messageId: string): Promise<void> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error, count } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('sender_id', user.id)
    .select('id', { count: 'exact', head: true })

  if (error) throw error
  if (!count || count === 0) throw new Error('Message not found or not owned by user')
}

export async function markMessagesAsRead(messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) return

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('message_reads')
    .upsert(
      messageIds.map((message_id) => ({ message_id, user_id: user.id })),
      { onConflict: 'message_id,user_id', ignoreDuplicates: true }
    )

  if (error) {
    console.error('markMessagesAsRead error:', error)
  }
}
