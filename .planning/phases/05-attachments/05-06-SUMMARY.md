---
phase: 05
plan: 06
subsystem: video-circles
tags: [video, mediarecorder, hold-to-record, circular, attachments, getUserMedia]
dependency_graph:
  requires: [05-01-attachments-foundation, 05-03-upload-client]
  provides: [VideoCircleRecorder, VideoCircleAttachment]
  affects: []
tech_stack:
  added: []
  patterns: [MediaRecorder, getUserMedia, hold-to-record, mimeType-fallback, fullscreen-overlay, playsInline]
key_files:
  created:
    - src/components/chat/attachments/VideoCircleRecorder.tsx
    - src/components/chat/attachments/VideoCircleAttachment.tsx
  modified: []
decisions:
  - "VideoCircleRecorder runs its own inline MediaRecorder (does NOT use useMediaRecorder hook) — video needs direct stream→<video>.srcObject wiring for the live circular preview, which the audio-focused hook does not expose. Plan text explicitly adopts this 'simpler approach'."
  - "mimeType fallback order for video: mp4 → webm (Safari priority, RESEARCH Pitfall 2)"
  - "Hold-to-record via mouse AND touch handlers (D-17) with touch preventDefault to avoid synthetic mouse events"
  - "60s MAX_DURATION_MS auto-stop mitigates T-05-06-01 DoS; server enforces 30MB via SIZE_LIMITS.video_circle from Plan 05-01"
  - "Escape key cancels recording without uploading (cancelledRef pattern distinguishes cancel vs. normal release)"
  - "Inline playback in bubble, NOT fullscreen modal (D-11); playsInline prevents iOS native fullscreen hijack"
  - "teardown() stops all stream tracks on every exit path (normal stop, error, unmount, cancel) — T-05-06-02 mitigation"
requirements: [ATT-04, ATT-06]
metrics:
  tasks_completed: 2
  files_created: 2
  files_modified: 0
  commits: 2
  completed_date: 2026-04-18
---

# Phase 05 Plan 06: Video Circles Summary

**One-liner:** Video-circle messages — hold-to-record fullscreen circular camera preview with 60s auto-stop and mp4→webm mimeType fallback (`VideoCircleRecorder`), and a 160×160 in-bubble circular inline player with `playsInline` iOS behavior (`VideoCircleAttachment`).

## What Was Built

### Task 1 — `src/components/chat/attachments/VideoCircleRecorder.tsx`
- 48×48 round trigger button (≥44px D-17 touch target) swaps icon `Video` → `Square` when recording.
- Four pointer handlers: `onMouseDown`, `onMouseUp`, `onMouseLeave`, `onTouchStart`, `onTouchEnd`. Touch handlers `preventDefault()` to suppress synthetic mouse events.
- `beginRecording()` calls `navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 480, facingMode: 'user' }, audio: true })`, creates `MediaRecorder` with feature-detected mimeType (`video/mp4` first, then `video/webm`), starts with 100ms timeslice, and attaches the live stream to a `<video ref>` inside a fullscreen overlay via `requestAnimationFrame`.
- Fullscreen overlay: `fixed inset-0 z-50 bg-black/85`, centered 280×280 circular preview with `rounded-full overflow-hidden ring-4 ring-red-500/80`, MM:SS timer + red pulse dot in a pill at top, hint text "Отпустите, чтобы отправить · Esc — отменить" below.
- `finish({cancel})` awaits recorder `stop` event, builds Blob from chunks, calls `uploadAttachment({ fileType: 'video_circle', metadata: { duration } })` with filename `video_${ts}.{mp4|webm}` (ext chosen by resolved mimeType), calls `onUploaded()` on success or `onError(msg)` on failure. Zero-byte blobs are silently dropped.
- `cancelledRef` flag set before `finish` lets the finalize path distinguish "user released normally" from "user pressed Escape" — cancelled path skips upload.
- 60-second hard cap enforced in the 100ms tick interval (`if (d >= MAX_DURATION_MS) void finish({ cancel: false })`) — T-05-06-01 mitigation.
- Feature-detect: button disabled with tooltip "Запись видео не поддерживается" when `navigator.mediaDevices` is missing, `MediaRecorder` is undefined, or `pickVideoMimeType()` returns empty.
- `teardown()` stops stream tracks, clears interval, nulls recorder/video srcObject; registered via `useEffect(() => teardown, [teardown])` so unmount releases camera+mic — T-05-06-02 mitigation.
- Escape key listener (mounted only while `recording`) sets `cancelledRef` and calls `finish({cancel:true})`.
- No `any`. Uses `brand-primary` / `brand-primary-hover` tokens — no raw hex.
- Commit: `efc44df`

### Task 2 — `src/components/chat/attachments/VideoCircleAttachment.tsx`
- `<VideoCircleAttachment path metadata isOwn />`. Fetches signed URL via `getAttachmentUrl(path)` on mount with cancellation-safe `cancelled` flag.
- Renders `h-[160px] w-[160px] rounded-full overflow-hidden bg-black` button containing a `<video>` with `src={url}`, `preload="metadata"`, `playsInline`, `object-cover`.
- Click toggles play/pause **inline** — no `requestFullscreen` call (D-11 explicitly: not fullscreen, not modal).
- Play overlay: centered 48×48 white circle with `Play` icon visible when paused, hidden when playing. `bg-black/30` dim behind it for contrast.
- Duration priority: `metadata.duration` (ms from sender) → `<video>.duration` (from `onLoadedMetadata`) → 0. Rendered as MM:SS in `font-mono text-[10px]` below the circle (D-12).
- `onEnded` resets `currentTime = 0` and sets `playing = false` — replay-ready.
- `isOwn` flips duration color: `text-white/80` on own bubble, `text-brand-text-muted` on others.
- No `any`, no `dangerouslySetInnerHTML`, no `next/image` (correct — this is `<video>`).
- Commit: `44afe92`

## Contracts

### `<VideoCircleRecorder>`
```typescript
interface VideoCircleRecorderProps {
  groupId: string
  onUploaded: () => void                   // called after successful uploadAttachment
  onError: (message: string) => void       // user-facing Russian message
}
```
Consumer (Plan 05-07 AttachmentPopup) renders `<VideoCircleRecorder groupId={...} onUploaded={closePopup} onError={toast} />`.

### `<VideoCircleAttachment>`
```typescript
interface VideoCircleAttachmentProps {
  path: string                             // storage object key
  metadata?: { duration?: number } | null  // duration in MILLISECONDS (from sender)
  isOwn?: boolean                          // flips duration-text palette
}
```
Consumer (Plan 05-07 MessageBubble `type`-switch, `case 'video_circle'`) renders `<VideoCircleAttachment path={att.path} metadata={att.metadata} isOwn={isOwn} />`.

### Upload payload shape
Calls `uploadAttachment({ file: Blob, fileName: 'video_<ts>.<mp4|webm>', fileType: 'video_circle', groupId, metadata: { duration: <ms> } })`. Consumed by Plan 05-01's `/api/upload` (30 MB cap) + `sendAttachment` (stores metadata as `Json`).

## Threat Model Coverage

| Threat ID | Status | Evidence |
|-----------|--------|----------|
| T-05-06-01 DoS unbounded recording | mitigate | `MAX_DURATION_MS = 60_000` + 100ms tick auto-stop in VideoCircleRecorder; server `SIZE_LIMITS.video_circle = 30 MB` in `/api/upload` (Plan 05-01) |
| T-05-06-02 Orphaned camera stream | mitigate | `teardown()` stops all tracks; registered via `useEffect(() => teardown, [teardown])`; also called from error path, normal finish, and cancel. `videoRef.srcObject = null` clears preview. |
| T-05-06-03 Fullscreen overlay captures background | accept | `fixed inset-0 z-50 bg-black/85` fully covers viewport; no cross-origin capture concern. |
| T-05-06-04 Forged metadata.duration | accept | Cosmetic only; no authorization relies on it. |
| T-05-06-05 Voice-as-video_circle mislabel | accept | Documented in plan — only increases allowed size cap, still 30 MB absolute; rendered type driven by `message_attachments.type` column. |

## Deviations from Plan

None — plan executed exactly as written. All file contents, acceptance-criteria grep strings, and behavioral invariants match the plan verbatim.

### Environment notes (not deviations)
- `npm run lint` and `npm run build` are known-blocked in this environment (Node v25 × `eslint-config-next` ETIMEDOUT loading the `react` plugin — pre-existing across Phase 5, documented in 05-01-SUMMARY and 05-05-SUMMARY). Verification relied on `npx tsc --noEmit` which returned 0 errors after each task. The execution_context explicitly authorizes this fallback: "Node v25 × Next 14 — rely on `npx tsc --noEmit`. Skip lint/build if env errors."

## Testing / Verification Status

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` after Task 1 | PASS (0 errors) |
| `npx tsc --noEmit` after Task 2 | PASS (0 errors) |
| Grep acceptance strings (Task 1) | PASS — 4 handlers (onMouseDown/Up/TouchStart/TouchEnd), `MAX_DURATION_MS = 60_000`, `pickVideoMimeType`, `video_circle`, `rounded-full overflow-hidden`, `Escape`, no `: any` |
| Grep acceptance strings (Task 2) | PASS — `getAttachmentUrl`, `h-[160px] w-[160px]`, `rounded-full overflow-hidden`, `playsInline`, no `dangerouslySetInnerHTML`, no `: any`, no `requestFullscreen` |
| `npm run lint` | ENV BLOCKED (eslint-config-next / react plugin ETIMEDOUT — Node v25 pre-existing) |
| `npm run build` | ENV BLOCKED (same cause) |
| Manual UX test | DEFERRED to Plan 05-07 checkpoint (wires VideoCircleRecorder into AttachmentPopup and VideoCircleAttachment into MessageBubble switch) |

## Next Steps

- **Plan 05-07** (integration) — the final Wave 3 plan:
  - Add `<VideoCircleRecorder>` to `AttachmentPopup`'s "Видео-кружок" slot alongside `<VoiceRecorderButton>` from Plan 05-05.
  - Add `case 'video_circle': return <VideoCircleAttachment ... />` branch to `MessageBubble`'s attachment type-switch alongside image/file/voice branches from Plans 05-03/05-04/05-05.
  - End-to-end manual verification at 05-07 checkpoint: press-and-hold trigger → circular camera overlay → release → uploaded video appears in bubble as 160×160 circle with duration → click plays inline (no fullscreen) → no open MediaStreamTrack in DevTools after unmount.

## Self-Check: PASSED

- `src/components/chat/attachments/VideoCircleRecorder.tsx` — FOUND
- `src/components/chat/attachments/VideoCircleAttachment.tsx` — FOUND
- Commit `efc44df` — FOUND in git log
- Commit `44afe92` — FOUND in git log
- `npx tsc --noEmit` — 0 errors
