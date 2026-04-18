'use client'

import { useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'
import { getAttachmentUrl } from '@/lib/actions/attachments'

interface VideoCircleAttachmentProps {
  path: string
  metadata?: { duration?: number } | null
  isOwn?: boolean
}

function formatSec(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function VideoCircleAttachment({ path, metadata, isOwn = false }: VideoCircleAttachmentProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    let cancelled = false
    getAttachmentUrl(path)
      .then((u) => { if (!cancelled) setUrl(u) })
      .catch(() => { /* show disabled state */ })
    return () => { cancelled = true }
  }, [path])

  const toggle = () => {
    const v = videoRef.current
    if (!v || !url) return
    if (playing) {
      v.pause()
      setPlaying(false)
    } else {
      void v.play()
      setPlaying(true)
    }
  }

  const durationSeconds = metadata?.duration != null
    ? metadata.duration / 1000
    : videoDuration ?? 0

  const durColor = isOwn ? 'text-white/80' : 'text-brand-text-muted'

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={toggle}
        disabled={!url}
        aria-label={playing ? 'Пауза' : 'Воспроизвести видео'}
        className="relative h-[160px] w-[160px] rounded-full overflow-hidden bg-black disabled:opacity-50 cursor-pointer"
      >
        {url && (
          <video
            ref={videoRef}
            src={url}
            preload="metadata"
            playsInline
            onLoadedMetadata={() => {
              if (videoRef.current && Number.isFinite(videoRef.current.duration)) {
                setVideoDuration(videoRef.current.duration)
              }
            }}
            onEnded={() => {
              setPlaying(false)
              if (videoRef.current) videoRef.current.currentTime = 0
            }}
            className="h-full w-full object-cover"
          />
        )}
        {!playing && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-brand-text">
              <Play size={20} strokeWidth={2} className="ml-0.5" />
            </span>
          </span>
        )}
      </button>
      <span className={`font-mono text-[10px] ${durColor}`}>
        {formatSec(durationSeconds)}
      </span>
    </div>
  )
}
