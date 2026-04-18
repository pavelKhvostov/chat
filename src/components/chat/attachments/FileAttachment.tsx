'use client'

import { useState } from 'react'
import { FileText, Download, Loader2 } from 'lucide-react'
import { getAttachmentUrl } from '@/lib/actions/attachments'
import { formatBytes } from '@/lib/utils/formatBytes'

interface FileAttachmentProps {
  path: string
  fileName: string
  fileSize: number
  isOwn?: boolean
}

type ClickState = 'idle' | 'loading' | 'error'

export function FileAttachment({
  path,
  fileName,
  fileSize,
  isOwn = false,
}: FileAttachmentProps) {
  const [state, setState] = useState<ClickState>('idle')

  const handleDownload = async () => {
    if (state === 'loading') return
    setState('loading')
    try {
      const url = await getAttachmentUrl(path)
      window.open(url, '_blank', 'noopener,noreferrer')
      setState('idle')
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const iconWrap = isOwn
    ? 'bg-white/20 text-white'
    : 'bg-coral-100 text-coral-500'
  const cardBg = isOwn
    ? 'bg-white/10 hover:bg-white/15'
    : 'bg-surface shadow-sh-1 hover:shadow-sh-2'
  const nameColor = isOwn ? 'text-white' : 'text-ink-900'
  const sizeColor = isOwn ? 'text-white/70' : 'text-ink-500'
  const chevronColor = isOwn ? 'text-white/80' : 'text-coral-500'

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={state === 'loading'}
      aria-label={`Скачать файл ${fileName}`}
      className={`flex items-center gap-3 min-h-[44px] max-w-[280px] px-3 py-2 rounded-2xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 ${cardBg}`}
    >
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${iconWrap}`}>
        <FileText size={18} strokeWidth={1.75} />
      </div>
      <div className="flex flex-col min-w-0 flex-1 text-left">
        <span className={`text-sm font-medium truncate ${nameColor}`}>
          {fileName}
        </span>
        <span className={`text-xs font-mono ${sizeColor}`}>
          {state === 'error' ? 'Ошибка загрузки' : formatBytes(fileSize)}
        </span>
      </div>
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center ${chevronColor}`}>
        {state === 'loading'
          ? <Loader2 size={16} strokeWidth={1.75} className="animate-spin" />
          : <Download size={16} strokeWidth={1.75} />
        }
      </div>
    </button>
  )
}
