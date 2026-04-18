'use client'

const BAR_COUNT = 40

function fallbackPattern(): number[] {
  // Deterministic sinusoidal-ish pattern for legacy recordings without captured amplitudes
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    const v = Math.sin((i / BAR_COUNT) * Math.PI * 4) * 0.5 + 0.5
    const jitter = Math.sin(i * 1.7) * 0.25
    return Math.max(0.2, Math.min(1, v + jitter))
  })
}

function normalize(raw: number[]): number[] {
  if (raw.length === 0) return fallbackPattern()
  const bucketSize = raw.length / BAR_COUNT
  const peaks: number[] = []
  for (let i = 0; i < BAR_COUNT; i++) {
    let peak = 0
    const start = Math.floor(i * bucketSize)
    const end = Math.floor((i + 1) * bucketSize) + 1
    for (let j = start; j < end && j < raw.length; j++) {
      if (raw[j] > peak) peak = raw[j]
    }
    peaks.push(peak)
  }
  const max = Math.max(...peaks, 1)
  return peaks.map((v) => v / max)
}

interface WaveformProps {
  amplitudes: number[]
  progress?: number // 0..1
  isOwn?: boolean
}

export function Waveform({ amplitudes, progress = 0, isOwn = false }: WaveformProps) {
  const normalized = normalize(amplitudes)
  const playedColor = isOwn ? 'bg-white' : 'bg-coral-500'
  const unplayedColor = isOwn ? 'bg-white/40' : 'bg-coral-500/30'

  return (
    <div className="flex items-center gap-[2px] h-8" aria-hidden="true">
      {normalized.map((v, i) => {
        const played = (i / BAR_COUNT) <= progress
        return (
          <span
            key={i}
            className={`w-[3px] rounded-full flex-shrink-0 ${played ? playedColor : unplayedColor}`}
            style={{ height: `${Math.max(4, v * 32)}px` }}
          />
        )
      })}
    </div>
  )
}
