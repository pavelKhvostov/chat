'use client'

import { type Tables } from '@/lib/types/database.types'
import { ImageAttachment } from './ImageAttachment'
import { FileAttachment } from './FileAttachment'
import { VoiceAttachment } from './VoiceAttachment'
import { VideoCircleAttachment } from './VideoCircleAttachment'

type AttachmentRow = Pick<
  Tables<'message_attachments'>,
  'id' | 'path' | 'type' | 'file_name' | 'file_size' | 'metadata'
>

interface AttachmentRendererProps {
  attachment: AttachmentRow
  isOwn: boolean
}

interface VoiceOrVideoMetadata {
  duration?: number
  amplitudes?: number[]
}

function parseMetadata(raw: AttachmentRow['metadata']): VoiceOrVideoMetadata | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as { duration?: unknown; amplitudes?: unknown }
  const duration = typeof obj.duration === 'number' ? obj.duration : undefined
  const amplitudes = Array.isArray(obj.amplitudes)
    ? obj.amplitudes.filter((v): v is number => typeof v === 'number')
    : undefined
  return { duration, amplitudes }
}

export function AttachmentRenderer({ attachment, isOwn }: AttachmentRendererProps) {
  const metadata = parseMetadata(attachment.metadata)

  switch (attachment.type) {
    case 'image':
      return <ImageAttachment path={attachment.path} fileName={attachment.file_name} />
    case 'file':
      return (
        <FileAttachment
          path={attachment.path}
          fileName={attachment.file_name}
          fileSize={attachment.file_size}
          isOwn={isOwn}
        />
      )
    case 'voice':
      return <VoiceAttachment path={attachment.path} metadata={metadata} isOwn={isOwn} />
    case 'video_circle':
      return (
        <VideoCircleAttachment
          path={attachment.path}
          metadata={metadata ? { duration: metadata.duration } : null}
          isOwn={isOwn}
        />
      )
    default:
      return null
  }
}
