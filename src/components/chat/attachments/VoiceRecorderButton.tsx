'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { useMediaRecorder } from '@/hooks/useMediaRecorder'
import { uploadAttachment } from './uploadClient'
import { Waveform } from './Waveform'

const MAX_DURATION_MS = 60_000

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface VoiceRecorderButtonProps {
  groupId: string
  onUploaded: () => void
  onError: (message: string) => void
}

export function VoiceRecorderButton({ groupId, onUploaded, onError }: VoiceRecorderButtonProps) {
  const recorder = useMediaRecorder('audio')
  const [uploading, setUploading] = useState(false)
  const stopGuardRef = useRef(false)

  const finishUpload = useCallback(async () => {
    if (stopGuardRef.current) return
    stopGuardRef.current = true
    try {
      const result = await recorder.stopRecording()
      if (result.blob.size === 0) return
      setUploading(true)
      await uploadAttachment({
        file: result.blob,
        fileName: `voice_${Date.now()}.${result.mimeType.includes('mp4') ? 'm4a' : 'webm'}`,
        fileType: 'voice',
        groupId,
        metadata: { duration: result.durationMs, amplitudes: result.amplitudes },
      })
      onUploaded()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка отправки голосового'
      onError(msg)
    } finally {
      setUploading(false)
      stopGuardRef.current = false
    }
  }, [recorder, groupId, onUploaded, onError])

  // Auto-stop at MAX_DURATION_MS
  useEffect(() => {
    if (!recorder.isRecording) return
    if (recorder.durationMs >= MAX_DURATION_MS) void finishUpload()
  }, [recorder.isRecording, recorder.durationMs, finishUpload])

  const handlePressStart = useCallback(async () => {
    if (!recorder.isSupported || uploading || recorder.isRecording) return
    try {
      await recorder.startRecording()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Нет доступа к микрофону'
      onError(msg)
    }
  }, [recorder, uploading, onError])

  const handlePressEnd = useCallback(() => {
    if (!recorder.isRecording) return
    void finishUpload()
  }, [recorder.isRecording, finishUpload])

  const disabled = !recorder.isSupported || uploading

  return (
    <div className="flex items-center gap-3">
      {recorder.isRecording && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-coral-100">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-mono text-xs text-ink-900">
            {formatDuration(recorder.durationMs)}
          </span>
          <div className="w-20">
            <Waveform amplitudes={recorder.amplitudes} />
          </div>
        </div>
      )}
      <button
        type="button"
        aria-label={recorder.isRecording ? 'Остановить запись' : 'Записать голосовое'}
        title={recorder.isSupported ? 'Зажмите и говорите' : 'Запись не поддерживается'}
        disabled={disabled}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={(e) => { e.preventDefault(); void handlePressStart() }}
        onTouchEnd={(e) => { e.preventDefault(); handlePressEnd() }}
        className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors select-none ${
          recorder.isRecording
            ? 'bg-red-500 text-white'
            : 'bg-coral-500 text-white hover:bg-coral-600 disabled:opacity-40'
        }`}
      >
        {recorder.isRecording
          ? <Square size={18} strokeWidth={2} />
          : <Mic size={18} strokeWidth={1.75} />
        }
      </button>
    </div>
  )
}
