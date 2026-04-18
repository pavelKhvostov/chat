'use client'

import { useEffect, useState } from 'react'
import { getAttachmentUrl } from '@/lib/actions/attachments'
import { ImageLightbox } from './ImageLightbox'

interface ImageAttachmentProps {
  path: string
  fileName: string
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; url: string }
  | { status: 'error' }

export function ImageAttachment({ path, fileName }: ImageAttachmentProps) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    getAttachmentUrl(path)
      .then((url) => { if (!cancelled) setState({ status: 'ready', url }) })
      .catch(() => { if (!cancelled) setState({ status: 'error' }) })
    return () => { cancelled = true }
  }, [path])

  if (state.status === 'loading') {
    return (
      <div className="w-[240px] h-[180px] rounded-2xl bg-coral-100 animate-pulse" />
    )
  }

  if (state.status === 'error') {
    return (
      <div className="px-3 py-2 rounded-2xl bg-coral-100 text-xs text-ink-500">
        Не удалось загрузить изображение
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        aria-label={`Открыть изображение ${fileName}`}
        className="block rounded-2xl overflow-hidden hover:opacity-95 transition-opacity cursor-pointer"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={state.url}
          alt={fileName}
          className="block max-w-[320px] max-h-[320px] object-cover"
        />
      </button>
      {lightboxOpen && (
        <ImageLightbox
          src={state.url}
          alt={fileName}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
}
