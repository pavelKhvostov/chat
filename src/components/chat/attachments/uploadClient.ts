'use client'

import { createClient } from '@/lib/supabase/client'
import {
  sendAttachment,
  type AttachmentType,
  type AttachmentMetadata,
} from '@/lib/actions/attachments'

interface UploadArgs {
  file: Blob
  fileName: string
  fileType: AttachmentType
  groupId: string
  metadata?: AttachmentMetadata
}

interface UploadUrlResponse {
  signedUrl: string
  token: string
  path: string
}

export async function uploadAttachment(args: UploadArgs): Promise<string> {
  const { file, fileName, fileType, groupId, metadata } = args

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName,
      fileSize: file.size,
      fileType,
      groupId,
    }),
  })

  if (!res.ok) {
    let message = `Upload init failed (${res.status})`
    try {
      const body = await res.json() as { error?: string }
      if (body.error) message = body.error
    } catch { /* ignore parse error */ }
    throw new Error(message)
  }

  const { token, path } = (await res.json()) as UploadUrlResponse

  const sb = createClient()
  const { error: uploadError } = await sb.storage
    .from('attachments')
    .uploadToSignedUrl(path, token, file)

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`)
  }

  const messageId = await sendAttachment({
    groupId,
    path,
    fileName,
    fileSize: file.size,
    type: fileType,
    metadata,
  })

  return messageId
}
