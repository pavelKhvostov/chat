'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Video, Square } from 'lucide-react'
import { uploadAttachment } from './uploadClient'

const MAX_DURATION_MS = 60_000

function pickVideoMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  if (MediaRecorder.isTypeSupported('video/mp4')) return 'video/mp4'
  if (MediaRecorder.isTypeSupported('video/webm')) return 'video/webm'
  return ''
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface VideoCircleRecorderProps {
  groupId: string
  onUploaded: () => void
  onError: (message: string) => void
}

export function VideoCircleRecorder({ groupId, onUploaded, onError }: VideoCircleRecorderProps) {
  const [supported, setSupported] = useState(true)
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [durationMs, setDurationMs] = useState(0)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const startTsRef = useRef(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    setSupported(
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof MediaRecorder !== 'undefined' &&
      pickVideoMimeType() !== ''
    )
  }, [])

  const teardown = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current)
    tickRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    recorderRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  useEffect(() => teardown, [teardown])

  const finish = useCallback(async (opts: { cancel: boolean }) => {
    const recorder = recorderRef.current
    if (!recorder) {
      teardown()
      setRecording(false)
      setDurationMs(0)
      return
    }

    const finalize = async () => {
      const mimeType = recorder.mimeType || pickVideoMimeType()
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const duration = Date.now() - startTsRef.current
      teardown()
      setRecording(false)
      setDurationMs(0)
      if (opts.cancel || blob.size === 0) return
      try {
        setUploading(true)
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
        await uploadAttachment({
          file: blob,
          fileName: `video_${Date.now()}.${ext}`,
          fileType: 'video_circle',
          groupId,
          metadata: { duration },
        })
        onUploaded()
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Ошибка отправки видео'
        onError(msg)
      } finally {
        setUploading(false)
      }
    }

    await new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => { void finalize().then(resolve) }, { once: true })
      try {
        recorder.stop()
      } catch {
        void finalize().then(resolve)
      }
    })
  }, [groupId, onError, onUploaded, teardown])

  const beginRecording = useCallback(async () => {
    if (!supported || recording || uploading) return
    cancelledRef.current = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 480, facingMode: 'user' },
        audio: true,
      })
      streamRef.current = stream
      const mimeType = pickVideoMimeType()
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorderRef.current = recorder
      recorder.start(100)
      startTsRef.current = Date.now()
      setRecording(true)
      setDurationMs(0)
      tickRef.current = setInterval(() => {
        const d = Date.now() - startTsRef.current
        setDurationMs(d)
        if (d >= MAX_DURATION_MS) void finish({ cancel: false })
      }, 100)

      // Attach stream to <video> once it's rendered
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Нет доступа к камере'
      onError(msg)
      teardown()
      setRecording(false)
    }
  }, [supported, recording, uploading, finish, onError, teardown])

  const endRecording = useCallback(() => {
    if (!recording) return
    void finish({ cancel: cancelledRef.current })
  }, [recording, finish])

  // Escape cancels
  useEffect(() => {
    if (!recording) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelledRef.current = true
        void finish({ cancel: true })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [recording, finish])

  const disabled = !supported || uploading

  return (
    <>
      <button
        type="button"
        aria-label={recording ? 'Остановить запись' : 'Записать видео-кружок'}
        title={supported ? 'Зажмите и снимайте' : 'Запись видео не поддерживается'}
        disabled={disabled}
        onMouseDown={() => void beginRecording()}
        onMouseUp={endRecording}
        onMouseLeave={endRecording}
        onTouchStart={(e) => { e.preventDefault(); void beginRecording() }}
        onTouchEnd={(e) => { e.preventDefault(); endRecording() }}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-white hover:bg-brand-primary-hover transition-colors disabled:opacity-40 select-none"
      >
        {recording
          ? <Square size={18} strokeWidth={2} />
          : <Video size={18} strokeWidth={1.75} />
        }
      </button>

      {recording && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-6">
          <div className="relative h-[280px] w-[280px] rounded-full overflow-hidden ring-4 ring-red-500/80 shadow-2xl bg-black">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono text-xs text-white">
                {formatDuration(durationMs)}
              </span>
            </div>
          </div>
          <p className="mt-6 text-sm text-white/80 text-center max-w-xs">
            Отпустите, чтобы отправить · Esc — отменить
          </p>
        </div>
      )}
    </>
  )
}
