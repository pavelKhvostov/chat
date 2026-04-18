'use server'

import { createClient } from '@/lib/supabase/server'
import { type Json } from '@/lib/types/database.types'

export type AttachmentType = 'image' | 'file' | 'voice' | 'video_circle'

export interface AttachmentMetadata {
  duration?: number
  amplitudes?: number[]
}

export interface AttachmentPayload {
  groupId: string
  path: string
  fileName: string
  fileSize: number
  type: AttachmentType
  metadata?: AttachmentMetadata
}

export async function sendAttachment(payload: AttachmentPayload): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: msg, error: msgError } = await supabase
    .from('messages')
    .insert({
      group_id: payload.groupId,
      sender_id: user.id,
      content: '',
    })
    .select('id')
    .single()

  if (msgError || !msg) throw msgError ?? new Error('Failed to create message')

  const metadataJson: Json | null = payload.metadata
    ? (payload.metadata as unknown as Json)
    : null

  const { error: attError } = await supabase
    .from('message_attachments')
    .insert({
      message_id: msg.id,
      path: payload.path,
      type: payload.type,
      file_name: payload.fileName,
      file_size: payload.fileSize,
      metadata: metadataJson,
    })

  if (attError) throw attError
  return msg.id
}

export async function getAttachmentUrl(path: string): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(path, 3600)
  if (error || !data) throw error ?? new Error('Failed to create signed URL')
  return data.signedUrl
}
