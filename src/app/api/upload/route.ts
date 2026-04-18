import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type FileType = 'image' | 'file' | 'voice' | 'video_circle'

const SIZE_LIMITS: Record<FileType, number> = {
  image: 10 * 1024 * 1024,        // 10 MB (ATT-01)
  file: 50 * 1024 * 1024,         // 50 MB (ATT-02)
  voice: 5 * 1024 * 1024,         // 5 MB (ATT-03)
  video_circle: 30 * 1024 * 1024, // 30 MB (ATT-04)
}

interface UploadRequest {
  fileName: string
  fileSize: number
  fileType: FileType
  groupId: string
}

function sanitizeFileName(name: string): string {
  // Strip directory separators and control characters; keep unicode
  return name.replace(/[/\\\x00-\x1f]/g, '_').slice(0, 200)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: UploadRequest
  try {
    body = await req.json() as UploadRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { fileName, fileSize, fileType, groupId } = body

  if (!fileName || typeof fileSize !== 'number' || !fileType || !groupId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (!(fileType in SIZE_LIMITS)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  if (fileSize <= 0 || fileSize > SIZE_LIMITS[fileType]) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 })
  }

  const { data: isMember, error: rpcError } = await supabase.rpc('is_group_member', { p_group_id: groupId })
  if (rpcError || !isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const safeName = sanitizeFileName(fileName)
  const path = `${user.id}/${groupId}/${Date.now()}_${safeName}`

  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUploadUrl(path)

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create upload URL' }, { status: 500 })
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path,
  })
}
