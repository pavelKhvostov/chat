'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'
import { getAttachmentUrl } from '@/lib/actions/attachments'
import { Waveform } from './Waveform'

interface VoiceAttachmentProps {
  path: string
  metadata?: { duration?: number; amplitudes?: number[] } | null
  isOwn?: boolean
}

function formatSec(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function VoiceAttachment({ path, metadata, isOwn = false }: VoiceAttachmentProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    let cancelled = false
    getAttachmentUrl(path)
      .then((u) => { if (!cancelled) setUrl(u) })
      .catch(() => { /* leave url null → button disabled */ })
    return () => { cancelled = true }
  }, [path])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const togglePlay = () => {
    if (!url) return
    if (!audioRef.current) {
      const audio = new Audio(url)
      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(Number.isFinite(audio.duration) ? audio.duration : null)
      })
      audio.addEventListener('timeupdate', () => {
        if (audio.duration > 0) setProgress(audio.currentTime / audio.duration)
      })
      audio.addEventListener('ended', () => {
        setPlaying(false)
        setProgress(0)
      })
      audioRef.current = audio
    }
    const audio = audioRef.current
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      void audio.play()
      setPlaying(true)
    }
  }

  const amplitudes = metadata?.amplitudes ?? []
  const durationSeconds = metadata?.duration != null
    ? metadata.duration / 1000
    : audioDuration ?? 0

  const btnBg = isOwn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-brand-primary text-white hover:bg-brand-primary-hover'
  const durColor = isOwn ? 'text-white/80' : 'text-brand-text-muted'

  return (
    <div className="flex items-center gap-3 min-w-[220px]">
      <button
        type="button"
        onClick={togglePlay}
        disabled={!url}
        aria-label={playing ? 'Пауза' : 'Воспроизвести'}
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors ${btnBg} disabled:opacity-40`}
      >
        {playing
          ? <Pause size={16} strokeWidth={2} />
          : <Play size={16} strokeWidth={2} className="ml-0.5" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <Waveform amplitudes={amplitudes} progress={progress} isOwn={isOwn} />
      </div>
      <span className={`font-mono text-xs flex-shrink-0 ${durColor}`}>
        {formatSec(durationSeconds)}
      </span>
    </div>
  )
}
