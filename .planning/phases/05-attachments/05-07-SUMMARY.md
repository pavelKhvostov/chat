---
phase: 05
plan: 07
subsystem: attachments-integration
tags: [attachments, integration, popup, bottom-sheet, message-bubble, message-input, chat-window]
dependency_graph:
  requires:
    - 05-01-attachments-foundation
    - 05-02-mobile-shell
    - 05-03-image-attachment
    - 05-04-file-attachment
    - 05-05-voice-messages
    - 05-06-video-circles
  provides:
    - AttachmentPopup
    - AttachmentRenderer
    - MessageInput-with-attachments
    - ChatWindow-with-attachment-error
  affects:
    - src/components/chat/MessageInput.tsx
    - src/components/chat/MessageBubble.tsx
    - src/components/chat/ChatWindow.tsx
tech_stack:
  added: []
  patterns:
    - popup-or-bottom-sheet-via-tailwind-md-prefix
    - type-switch-renderer
    - hidden-file-input-programmatic-click
    - mode-switched-input-area
    - realtime-driven-bubble-render (no optimistic UI for attachments — Pitfall 6)
key_files:
  created:
    - src/components/chat/attachments/AttachmentPopup.tsx
    - src/components/chat/attachments/AttachmentRenderer.tsx
  modified:
    - src/components/chat/MessageInput.tsx
    - src/components/chat/MessageBubble.tsx
    - src/components/chat/ChatWindow.tsx
decisions:
  - "AttachmentPopup uses a single element with Tailwind md: prefix to switch between bottom sheet (mobile) and popover (desktop) — no JS viewport query, no dual markup, no hydration mismatch risk"
  - "AttachmentRenderer owns jsonb parsing (parseMetadata narrows unknown to {duration?: number; amplitudes?: number[]}) — bubble components stay unaware of Supabase Json type"
  - "Paperclip button becomes popup trigger; no separate attachment icons in input row"
  - "Voice/video modes take over the whole input area (not inline next to textarea) so hold-to-record UX has full touch surface"
  - "Pitfall 6: NO optimistic bubble for attachments — upload is async+unpredictable, Realtime INSERT drives render. Text optimistic flow in ChatWindow is unchanged and orthogonal."
  - "attachmentError auto-clears after 4000ms via effect timeout (RAII via cleanup)"
requirements: [ATT-01, ATT-02, ATT-03, ATT-04, ATT-05, ATT-06, ATT-07, ATT-08]
metrics:
  tasks_completed: 3
  files_created: 2
  files_modified: 3
  commits: 3
  completed_date: 2026-04-18
---

# Phase 05 Plan 07: Attachments Integration Summary

**One-liner:** Final wave of Phase 5 — two new components (`AttachmentPopup` 4-option menu with Tailwind-md responsive popover/bottom-sheet, and `AttachmentRenderer` type-switch with jsonb metadata narrowing) compose all previously-built primitives into `MessageInput`/`MessageBubble`/`ChatWindow`, producing end-to-end image, file, voice, and video-circle flows with a 4-second auto-clearing error banner and no optimistic UI (per Pitfall 6).

## What Was Built

### Task 1 — `src/components/chat/attachments/AttachmentPopup.tsx`
- 4 rows: Фото / Файл / Голос / Видео-кружок with Lucide icons inside `brand-primary-soft` tiles.
- Responsive switch via Tailwind `md:` prefix on a single element:
  - Mobile (<768px): `fixed inset-x-0 bottom-0 rounded-t-3xl` bottom sheet with backdrop button + drag handle.
  - Desktop (≥768px): `md:absolute md:bottom-full md:left-0 md:mb-2 md:w-56 md:rounded-2xl` popover anchored above the trigger.
- Each menu item is a `<button role="menuitem">` with `min-h-[44px]` (D-17).
- Escape key via `useEffect`-registered `keydown` listener (only when `open=true`).
- Backdrop click (`fixed inset-0 bg-black/30`) closes on mobile; on desktop the backdrop becomes transparent and pointer-events-none so it does not eat clicks.
- Commit: `6c78ab3`

### Task 2 — `src/components/chat/attachments/AttachmentRenderer.tsx` + `MessageBubble.tsx`
- `AttachmentRenderer({ attachment, isOwn })` switches over `attachment.type`: `image` → `<ImageAttachment>`, `file` → `<FileAttachment>` (with `isOwn`+`fileSize`), `voice` → `<VoiceAttachment>` (with parsed metadata), `video_circle` → `<VideoCircleAttachment>` (with `duration` only).
- Private `parseMetadata(raw: Json)` narrows unknown object to `{ duration?: number; amplitudes?: number[] }` — filters arrays via `(v): v is number => typeof v === 'number'`.
- `MessageBubble` renders `message.attachments.map(...)` in a `flex flex-col gap-2` block inside the bubble, before the timestamp row, with `mb-2` margin only when text content is also present.
- Content span now conditional: `message.content ? <span>...</span> : null` — attachment-only bubbles no longer emit a stray empty text node that adds whitespace.
- Commit: `0e30ad3`

### Task 3 — `MessageInput.tsx` + `ChatWindow.tsx`
- **MessageInput** gained:
  - `onAttachmentError: (message: string) => void` required prop.
  - Internal `mode: 'text' | 'voice' | 'video'` state. Text mode renders the full input row; voice/video modes replace it with `<VoiceRecorderButton>` or `<VideoCircleRecorder>` plus an X cancel button.
  - Paperclip button upgraded to `h-11 w-11` (≥44px D-17), now `aria-haspopup="menu"` + `aria-expanded` + toggles `popupOpen`. `AttachmentPopup` mounts inside a `relative` wrapper around the paperclip so desktop popover anchors correctly.
  - Hidden file inputs: `imageInputRef` with `accept="image/jpeg,image/png,image/gif,image/webp"`, `fileInputRef` with no accept restriction. `onChange` handler resets `e.target.value = ''` so re-picking the same file still fires change.
  - Image/file uploads call `uploadAttachment({ file, fileName, fileType, groupId })` directly — errors surface via `onAttachmentError`, no optimistic UI.
  - Text mode, reply preview, and typing indicator flow unchanged.
- **ChatWindow** gained:
  - `attachmentError: string | null` state.
  - `useEffect` auto-clears after 4000ms (cleanup via `clearTimeout`).
  - Red-tinted banner (`rounded-2xl bg-red-500/10 text-red-600`) rendered above MessageInput when error present.
  - Passes `onAttachmentError={setAttachmentError}` to MessageInput.
- Commit: `9bc2067`

### Task 4 — End-to-end verification checkpoint
- Status: **PENDING_USER_VERIFY**. Blocking. Orchestrator/user must run `npm run dev`, exercise all four flows on ≥1024px and 375px viewports, and type "approved" (or report issues).

## Contracts

### `<AttachmentPopup>`
```typescript
export type AttachmentPickType = 'image' | 'file' | 'voice' | 'video_circle'

interface AttachmentPopupProps {
  open: boolean
  onClose: () => void
  onPick: (type: AttachmentPickType) => void
}
```
Caller wraps in a `relative` element (desktop anchor). Popup self-closes after `onPick` via its internal `handlePick`.

### `<AttachmentRenderer>`
```typescript
type AttachmentRow = Pick<
  Tables<'message_attachments'>,
  'id' | 'path' | 'type' | 'file_name' | 'file_size' | 'metadata'
>

interface AttachmentRendererProps {
  attachment: AttachmentRow
  isOwn: boolean
}
```
Unknown `attachment.type` returns null (defensive — DB CHECK constraint prevents this).

### `<MessageInput>` — new API
```typescript
interface MessageInputProps {
  groupId: string
  onSend: (text: string, replyToId?: string) => Promise<void>
  replyTo: ReplyTarget | null
  onCancelReply: () => void
  onTyping: (isTyping: boolean) => void
  onAttachmentError: (message: string) => void   // NEW
}
```

### `<ChatWindow>` — no external API change
Internal addition: `attachmentError` state + 4s auto-clear + banner + `onAttachmentError` callback wired to MessageInput.

## Requirement Coverage

| Req    | Satisfied by                                                         |
|--------|----------------------------------------------------------------------|
| ATT-01 | Image: AttachmentPopup → hidden image input → uploadAttachment → Realtime → `<ImageAttachment>` bubble |
| ATT-02 | Voice: AttachmentPopup → mode=voice → `<VoiceRecorderButton>` hold-to-record → Realtime → `<VoiceAttachment>` (Plan 05-05 + 05-07 wiring) |
| ATT-03 | Voice playback: `<VoiceAttachment>` with play/pause + waveform progress (Plan 05-05 + 05-07 type-switch) |
| ATT-04 | Video-circle: AttachmentPopup → mode=video → `<VideoCircleRecorder>` hold-to-record → Realtime → `<VideoCircleAttachment>` 160×160 inline (Plan 05-06 + 05-07 wiring) |
| ATT-05 | Image lightbox: `<ImageAttachment>` clicks open `<ImageLightbox>` (Plan 05-03, rendered via 05-07 type-switch) |
| ATT-06 | Metadata: amplitudes/duration stored in `message_attachments.metadata` jsonb; AttachmentRenderer parses safely |
| ATT-07 | File card: `<FileAttachment>` renders name+size+click-to-download (Plan 05-04, rendered via 05-07 type-switch) |
| ATT-08 | Signed download: `getAttachmentUrl(path)` in `<FileAttachment>` yields time-limited URL (Plan 05-01 + 05-04) |

Mobile UX (D-17, D-18): popup is bottom sheet on <768px, all trigger buttons ≥44px. Hold-to-record has both mouse and touch handlers (Plans 05-05 + 05-06).

## Threat Model Coverage

| Threat ID | Status | Evidence |
|-----------|--------|----------|
| T-05-07-01 Information disclosure via file_name | mitigate | `AttachmentRenderer` passes `file_name` as React child/prop only; no `dangerouslySetInnerHTML` in any Phase 5 file (verified via `grep -rn dangerouslySetInnerHTML src/components/chat/` = 0) |
| T-05-07-02 Client-side file-type bypass | accept | Client `accept` is UX only; `/api/upload` (Plan 05-01) re-validates `fileType` against `SIZE_LIMITS` server-side |
| T-05-07-03 Concurrent upload DoS | accept | Acceptable for ~100-user internal tool; browser fetch concurrency cap applies |
| T-05-07-04 Signed-URL replay | mitigate | Supabase single-use token — second use fails at Storage layer |

## Deviations from Plan

None — plan executed exactly as written. All file contents, acceptance-criteria grep strings, and behavioral invariants match the plan verbatim.

### Environment notes (not deviations)
- `npm run lint` and `npm run build` remain ENV-BLOCKED on Node v25 × `eslint-config-next` (ETIMEDOUT loading the `react` plugin — pre-existing across Phase 5, documented in 05-01-SUMMARY). Per execution_context directive ("Node v25 × Next 14 — rely on `npx tsc --noEmit`. Skip lint/build if env errors"), verification relied on `npx tsc --noEmit` which returned 0 errors after each of the three auto tasks.
- Task 1's `AttachmentPopup.tsx` existed on disk as an uncommitted file at the start of this execution (matches plan verbatim from a prior aborted pass). It was verified byte-equivalent to the plan's `<action>` block and committed as `6c78ab3` to lock it into history.

## Testing / Verification Status

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` after Task 1 | PASS (0 errors) |
| `npx tsc --noEmit` after Task 2 | PASS (0 errors) |
| `npx tsc --noEmit` after Task 3 | PASS (0 errors) |
| Grep acceptance strings (Task 1) | PASS — `'image'`, `'file'`, `'voice'`, `'video_circle'`, `min-h-[44px]`, `md:absolute`, `Escape` |
| Grep acceptance strings (Task 2) | PASS — `case 'image'`, `case 'file'`, `case 'voice'`, `case 'video_circle'`, `AttachmentRenderer` in MessageBubble, `message.attachments` rendered, no `: any` |
| Grep acceptance strings (Task 3) | PASS — `AttachmentPopup`, `VoiceRecorderButton`, `VideoCircleRecorder`, `uploadAttachment`, `image/jpeg,image/png,image/gif,image/webp`, `onAttachmentError`, `h-11 w-11`, `attachmentError`, no `: any` in either file |
| `npm run lint` | ENV BLOCKED (eslint-config-next / react plugin ETIMEDOUT — Node v25 pre-existing) |
| `npm run build` | ENV BLOCKED (same cause) |
| Task 4 end-to-end checkpoint | **PENDING_USER_VERIFY** |

## Self-Check: PASSED

- `src/components/chat/attachments/AttachmentPopup.tsx` — FOUND
- `src/components/chat/attachments/AttachmentRenderer.tsx` — FOUND
- `src/components/chat/MessageInput.tsx` — MODIFIED (popup trigger, modes, onAttachmentError)
- `src/components/chat/MessageBubble.tsx` — MODIFIED (AttachmentRenderer integration, content guard)
- `src/components/chat/ChatWindow.tsx` — MODIFIED (attachmentError state + banner + wiring)
- Commit `6c78ab3` (Task 1 AttachmentPopup) — FOUND in git log
- Commit `0e30ad3` (Task 2 AttachmentRenderer + MessageBubble) — FOUND in git log
- Commit `9bc2067` (Task 3 MessageInput + ChatWindow) — FOUND in git log
- `npx tsc --noEmit` after every task — 0 errors
- Task 4 checkpoint: PENDING_USER_VERIFY (blocking — user runs `npm run dev` and types "approved")
