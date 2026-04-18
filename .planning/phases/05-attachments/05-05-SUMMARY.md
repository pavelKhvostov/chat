---
phase: 05
plan: 05
subsystem: voice-messages
tags: [voice, mediarecorder, waveform, hold-to-record, web-audio, attachments]
dependency_graph:
  requires: [05-01-attachments-foundation, 05-03-upload-client]
  provides: [useMediaRecorder, Waveform, VoiceRecorderButton, VoiceAttachment]
  affects: []
tech_stack:
  added: []
  patterns: [MediaRecorder, AnalyserNode, getUserMedia, hold-to-record, mimeType-fallback]
key_files:
  created:
    - src/hooks/useMediaRecorder.ts
    - src/components/chat/attachments/Waveform.tsx
    - src/components/chat/attachments/VoiceRecorderButton.tsx
    - src/components/chat/attachments/VoiceAttachment.tsx
  modified: []
decisions:
  - "useMediaRecorder is generic over 'audio' | 'video' so Plan 05-06 (video circles) reuses the same hook"
  - "mimeType fallback chain: audio webm→mp4, video mp4→webm — covers Safari (RESEARCH Pitfall 2)"
  - "Waveform fallback pattern is deterministic (sin-based) so legacy recordings without amplitudes render identically on all clients (D-08 deferred)"
  - "VoiceRecorderButton hard-caps recording at 60_000 ms via auto-stop effect (T-05-05-01 DoS mitigation)"
  - "Cleanup registered via useEffect(() => cleanup, [cleanup]) guarantees mic stream release on unmount (T-05-05-02)"
requirements: [ATT-03, ATT-05, ATT-06]
metrics:
  tasks_completed: 3
  files_created: 4
  files_modified: 0
  commits: 3
  completed_date: 2026-04-18
---

# Phase 05 Plan 05: Voice Messages Summary

**One-liner:** End-to-end voice messages — reusable `useMediaRecorder` hook with mimeType feature-detection and AnalyserNode amplitude capture, deterministic `Waveform` renderer, hold-to-record `VoiceRecorderButton` with 60s auto-stop, and in-bubble `VoiceAttachment` player with synced waveform progress.

## What Was Built

### Task 1 — `src/hooks/useMediaRecorder.ts`
- Generic over `'audio' | 'video'` (Plan 05-06 will reuse for video circles).
- `pickMimeType()` feature-detects via `MediaRecorder.isTypeSupported`: audio `webm → mp4`, video `mp4 → webm`.
- `isSupported` flag guards SSR and old browsers (`navigator.mediaDevices && typeof MediaRecorder !== 'undefined'`).
- `startRecording()` calls `getUserMedia`, opens a private `AudioContext` + `AnalyserNode` (audio only, fftSize 256), captures peak amplitude per rAF tick into an internal ref buffer, and starts a 100ms state-tick interval that mirrors the ref into state.
- `stopRecording()` returns `Promise<MediaRecorderResult>` with `{ blob, mimeType, durationMs, amplitudes }`. Uses `mr.mimeType` as primary source of truth (falls back to `pickMimeType(type)` if empty string).
- `cancelRecording()` tears everything down without resolving a blob (for error paths).
- `cleanup()`: cancels rAF, clears interval, closes AudioContext, stops all stream tracks, nulls refs. Registered via `useEffect(() => cleanup, [cleanup])`, so unmount releases the mic immediately.
- No `any`. `webkitAudioContext` typed via narrow `WebkitWindow` intersection.
- Commit: `6aae636`

### Task 2 — `src/components/chat/attachments/Waveform.tsx`
- `BAR_COUNT = 40`. Renders 40 `<span>` bars with width 3px, gap 2px, heights 4px..32px, rounded-full.
- `normalize(raw)`: buckets raw samples into 40 peaks, normalizes against max.
- `fallbackPattern()`: deterministic `sin((i/40)*π*4) * 0.5 + 0.5 + sin(i*1.7)*0.25` — two clients rendering the same legacy recording see identical bars (no `Math.random`).
- `progress` prop (0..1) drives played-vs-unplayed coloring. `isOwn` flips palette: played `bg-white`/unplayed `bg-white/40` on own bubble; played `bg-brand-primary`/unplayed `bg-brand-primary/30` on others.
- `aria-hidden="true"` — waveform is decorative.
- Commit: `5b536d8`

### Task 3 — VoiceRecorderButton + VoiceAttachment

**`VoiceRecorderButton.tsx`:**
- Holds `useMediaRecorder('audio')`. Press down (mouse OR touch) → `startRecording`. Release → `finishUpload` (stopRecording + uploadAttachment).
- Four pointer handlers registered: `onMouseDown`, `onMouseUp`, `onMouseLeave`, `onTouchStart`, `onTouchEnd`. Touch handlers `preventDefault()` to avoid synthetic mouse events.
- `onMouseLeave` stops recording if pointer drags off — prevents stuck recording state when pointer capture is lost.
- `MAX_DURATION_MS = 60_000`. An effect watches `durationMs` and auto-calls `finishUpload` at 60s (T-05-05-01).
- `stopGuardRef` guards against double-stop from mouse-leave + mouse-up firing in quick succession or overlapping with the 60s auto-stop effect.
- Live preview while recording: red pulse dot + `MM:SS` timer + 80px `<Waveform amplitudes={recorder.amplitudes} />` inside a `bg-brand-primary-soft` pill.
- Upload uses `uploadAttachment({ fileType: 'voice', metadata: { duration, amplitudes } })`. Filename `voice_${ts}.${m4a|webm}` chosen by mimeType.
- Disabled state: `!isSupported || uploading`. Tooltip swaps between "Зажмите и говорите" and "Запись не поддерживается".
- 48×48px button (≥44px D-17 touch target).

**`VoiceAttachment.tsx`:**
- Fetches signed URL via `getAttachmentUrl(path)` on mount (cancellation-safe with `cancelled` flag). Never caches globally — each instance holds its own 1h-TTL URL.
- `<audio>` element is lazily created inside `togglePlay` (no auto-play, no network until user clicks). Listeners for `loadedmetadata`, `timeupdate`, `ended`.
- `progress = currentTime / duration` passed to `<Waveform>`, giving played/unplayed coloring synced to playback.
- Duration priority: `metadata.duration` (ms from sender) → `audio.duration` (after load) → `0:00`.
- Cleanup on unmount: `audio.pause()` + null the ref.
- Layout: `[play/pause 40×40] [waveform flex-1] [MM:SS font-mono]`, `min-w-[220px]` so the pill never looks squished in a narrow bubble.
- `isOwn` flips button palette: `bg-white/20` on own, `bg-brand-primary` on others.

- Commit: `5ae34e8`

## Contracts

### `useMediaRecorder(type)`
```typescript
type MediaRecorderType = 'audio' | 'video'

interface MediaRecorderResult {
  blob: Blob
  mimeType: string
  durationMs: number
  amplitudes: number[]
}

useMediaRecorder(type: MediaRecorderType) => {
  isRecording: boolean
  isSupported: boolean
  durationMs: number           // ticks every ~100ms while recording
  amplitudes: number[]         // live peak samples, empty for video
  startRecording: () => Promise<void>
  stopRecording:  () => Promise<MediaRecorderResult>
  cancelRecording: () => void
}
```

### `<Waveform>`
```typescript
interface WaveformProps {
  amplitudes: number[]     // raw samples; bucketed/normalized internally. Empty → deterministic fallback.
  progress?: number        // 0..1, defaults to 0
  isOwn?: boolean          // flips palette
}
```

### `<VoiceRecorderButton>`
```typescript
interface VoiceRecorderButtonProps {
  groupId: string
  onUploaded: () => void                      // called after successful uploadAttachment
  onError: (message: string) => void          // user-facing Russian message
}
```
Consumer (Plan 05-07 popup) renders `<VoiceRecorderButton groupId={...} onUploaded={closePopup} onError={toast} />` — no other wiring needed.

### `<VoiceAttachment>`
```typescript
interface VoiceAttachmentProps {
  path: string                                          // storage object key
  metadata?: { duration?: number; amplitudes?: number[] } | null
  isOwn?: boolean
}
```
Consumer (Plan 05-07 MessageBubble `type`-switch) renders `<VoiceAttachment path={att.path} metadata={att.metadata} isOwn={isOwn} />`.

## Threat Model Coverage

| Threat ID | Status | Evidence |
|-----------|--------|----------|
| T-05-05-01 DoS unbounded recording | mitigate | `MAX_DURATION_MS = 60_000` auto-stop effect in VoiceRecorderButton + SIZE_LIMITS.voice = 5 MB in `/api/upload` (Plan 05-01) |
| T-05-05-02 Orphaned mic stream | mitigate | `useEffect(() => cleanup, [cleanup])` in useMediaRecorder; cleanup calls `stream.getTracks().forEach(t => t.stop())` |
| T-05-05-03 Forged metadata | accept | Metadata is cosmetic; no access decision relies on it. Stored as-is in `message_attachments.metadata` jsonb |
| T-05-05-04 Malicious voice blob | mitigate | 5 MB size cap + private Storage bucket + signed URL 1h TTL; blob never executed server-side |

## Deviations from Plan

None — plan executed exactly as written. All file contents, acceptance-criteria grep strings, and behavioral invariants match the plan verbatim.

### Environment notes (not deviations)
- `npm run lint` and `npm run build` are known-blocked in this environment (Node v25 × `eslint-config-next` ETIMEDOUT loading the `react` plugin — pre-existing across Phase 5, see 05-01-SUMMARY §"Testing / Verification Status"). Verification relied on `npx tsc --noEmit` which returned 0 errors after each task. The execution_context explicitly authorizes this fallback ("Node v25 × Next 14 — rely on `npx tsc --noEmit`. Skip lint/build if env errors").

## Testing / Verification Status

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` after Task 1 | PASS (0 errors) |
| `npx tsc --noEmit` after Task 2 | PASS (0 errors) |
| `npx tsc --noEmit` after Task 3 | PASS (0 errors) |
| Grep acceptance strings (Task 1) | PASS — `'use client'`, `isTypeSupported`, `getUserMedia`, `createAnalyser`, `pickMimeType`, no `: any` |
| Grep acceptance strings (Task 2) | PASS — `BAR_COUNT = 40`, `fallbackPattern`, `normalize`, no `Math.random` |
| Grep acceptance strings (Task 3) | PASS — 4/4 handlers, `MAX_DURATION_MS = 60_000`, `fileType: 'voice'`, `getAttachmentUrl`, `Waveform`, no `dangerouslySetInnerHTML`, no `: any` |
| `npm run lint` | ENV BLOCKED (eslint-config-next / react plugin ETIMEDOUT — Node v25 pre-existing) |
| `npm run build` | ENV BLOCKED (same cause) |
| Manual UX test | DEFERRED to Plan 05-07 checkpoint (wires button into popup + attachment into MessageBubble) |

## Next Steps

- **Plan 05-06** (video circles) imports `useMediaRecorder('video')` and reuses the mimeType fallback + cleanup infrastructure. No duplication of MediaRecorder logic.
- **Plan 05-07** wires `<VoiceRecorderButton>` into `AttachmentPopup`'s Voice slot and adds a `'voice'` branch to `MessageBubble`'s attachment switch rendering `<VoiceAttachment>`. After that, end-to-end manual verification (record → upload → appears → play with progress) runs at the 05-07 checkpoint.

## Self-Check: PASSED

- `src/hooks/useMediaRecorder.ts` — FOUND
- `src/components/chat/attachments/Waveform.tsx` — FOUND
- `src/components/chat/attachments/VoiceRecorderButton.tsx` — FOUND
- `src/components/chat/attachments/VoiceAttachment.tsx` — FOUND
- Commit `6aae636` — FOUND in git log
- Commit `5b536d8` — FOUND in git log
- Commit `5ae34e8` — FOUND in git log
- `npx tsc --noEmit` — 0 errors
