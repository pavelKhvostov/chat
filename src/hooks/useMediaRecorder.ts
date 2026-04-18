'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type MediaRecorderType = 'audio' | 'video'

export interface MediaRecorderResult {
  blob: Blob
  mimeType: string
  durationMs: number
  amplitudes: number[]
}

interface HookState {
  isRecording: boolean
  isSupported: boolean
  durationMs: number
  amplitudes: number[]
}

function pickMimeType(type: MediaRecorderType): string {
  if (typeof MediaRecorder === 'undefined') return ''
  if (type === 'video') {
    if (MediaRecorder.isTypeSupported('video/mp4')) return 'video/mp4'
    if (MediaRecorder.isTypeSupported('video/webm')) return 'video/webm'
    return ''
  }
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
  return ''
}

export function useMediaRecorder(type: MediaRecorderType) {
  const [state, setState] = useState<HookState>(() => ({
    isRecording: false,
    isSupported:
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof MediaRecorder !== 'undefined',
    durationMs: 0,
    amplitudes: [],
  }))

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const amplitudesRef = useRef<number[]>([])
  const rafRef = useRef<number | null>(null)
  const startTsRef = useRef<number>(0)
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (tickTimerRef.current) clearInterval(tickTimerRef.current)
    tickTimerRef.current = null
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    analyserRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
  }, [])

  useEffect(() => cleanup, [cleanup])

  const startRecording = useCallback(async (): Promise<void> => {
    if (!state.isSupported) throw new Error('MediaRecorder не поддерживается этим браузером')

    const constraints: MediaStreamConstraints =
      type === 'audio'
        ? { audio: true }
        : { video: { width: 480, height: 480, facingMode: 'user' }, audio: true }

    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    streamRef.current = stream
    chunksRef.current = []
    amplitudesRef.current = []

    const mimeType = pickMimeType(type)
    if (!mimeType) {
      stream.getTracks().forEach((t) => t.stop())
      throw new Error('Формат записи не поддерживается')
    }

    const mr = new MediaRecorder(stream, { mimeType })
    mr.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }
    mediaRecorderRef.current = mr
    mr.start(100)

    if (type === 'audio') {
      type WebkitWindow = typeof window & { webkitAudioContext?: typeof AudioContext }
      const w = window as WebkitWindow
      const AudioCtor: typeof AudioContext = window.AudioContext ?? w.webkitAudioContext!
      const ctx = new AudioCtor()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const data = new Uint8Array(analyser.frequencyBinCount)
      const capture = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteTimeDomainData(data)
        let peak = 0
        for (let i = 0; i < data.length; i++) {
          const v = Math.abs(data[i] - 128)
          if (v > peak) peak = v
        }
        amplitudesRef.current.push(peak)
        rafRef.current = requestAnimationFrame(capture)
      }
      capture()
    }

    startTsRef.current = Date.now()
    setState((s) => ({ ...s, isRecording: true, durationMs: 0, amplitudes: [] }))

    tickTimerRef.current = setInterval(() => {
      const d = Date.now() - startTsRef.current
      setState((s) => ({ ...s, durationMs: d, amplitudes: [...amplitudesRef.current] }))
    }, 100)
  }, [state.isSupported, type])

  const stopRecording = useCallback((): Promise<MediaRecorderResult> => {
    return new Promise<MediaRecorderResult>((resolve, reject) => {
      const mr = mediaRecorderRef.current
      if (!mr) {
        reject(new Error('Recorder не запущен'))
        return
      }
      const onStop = () => {
        const mimeType = mr.mimeType || pickMimeType(type)
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const durationMs = Date.now() - startTsRef.current
        const amplitudes = [...amplitudesRef.current]
        cleanup()
        setState((s) => ({ ...s, isRecording: false, durationMs, amplitudes }))
        resolve({ blob, mimeType, durationMs, amplitudes })
      }
      mr.addEventListener('stop', onStop, { once: true })
      try {
        mr.stop()
      } catch (e) {
        reject(e as Error)
      }
    })
  }, [cleanup, type])

  const cancelRecording = useCallback(() => {
    cleanup()
    setState((s) => ({ ...s, isRecording: false, durationMs: 0, amplitudes: [] }))
  }, [cleanup])

  return {
    isRecording: state.isRecording,
    isSupported: state.isSupported,
    durationMs: state.durationMs,
    amplitudes: state.amplitudes,
    startRecording,
    stopRecording,
    cancelRecording,
  }
}
