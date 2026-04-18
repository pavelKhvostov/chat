---
phase: 05
plan: 03
subsystem: attachments-image
tags: [attachments, image, lightbox, client-upload, signed-url, wave-2]
dependency_graph:
  requires: [05-01]
  provides: [uploadAttachment-helper, ImageAttachment-component, ImageLightbox-overlay]
  affects: []
tech_stack:
  added: []
  patterns: [uploadToSignedUrl, signed URL fetch on mount, discriminated union load state, lightbox overlay with body scroll lock]
key_files:
  created:
    - src/components/chat/attachments/uploadClient.ts
    - src/components/chat/attachments/ImageLightbox.tsx
    - src/components/chat/attachments/ImageAttachment.tsx
  modified: []
decisions:
  - "Native <img> element (not next/image) — signed URLs are dynamic and Next optimizer requires domain whitelisting; RESEARCH §Don't Hand-Roll confirms"
  - "Signed URL fetched per-mount — no global cache; 1h TTL covers a session per Pitfall 4"
  - "ESLint @next/next/no-img-element suppressed inline with comment (intentional exception per RESEARCH)"
requirements: [ATT-01, ATT-05]
metrics:
  tasks_completed: 3
  files_created: 3
  files_modified: 0
  commits: 3
  completed_date: 2026-04-18
---

# Phase 05 Plan 03: Image Attachments + Lightbox Summary

**One-liner:** Shared client upload helper (`uploadAttachment`), plus `ImageAttachment` thumbnail renderer and `ImageLightbox` fullscreen overlay — three isolated files ready for Plan 05-07 to wire into MessageBubble's type-switch.

## What Was Built

### Task 1 — `uploadClient.ts`
- `'use client'` helper orchestrating the full upload flow:
  1. `POST /api/upload` with `{fileName, fileSize, fileType, groupId}` → receives `{signedUrl, token, path}`
  2. `sb.storage.from('attachments').uploadToSignedUrl(path, token, file)` — direct client write using short-lived token
  3. `sendAttachment({...})` Server Action — persists `messages` + `message_attachments` rows
- Returns `Promise<string>` (new message id).
- Error handling:
  - `/api/upload` non-200 → parses server's `error` field; falls back to `Upload init failed (<status>)`
  - Storage error → throws `Storage upload failed: <message>`
  - `sendAttachment` error → propagates unchanged
- No `any` types; `UploadUrlResponse` is typed.
- Commit: `10571a2`

### Task 2 — `ImageLightbox.tsx`
- Fullscreen modal per D-13: `fixed inset-0 z-50 flex items-center justify-center bg-black/80`.
- Image at `max-w-[90vw] max-h-[90vh] object-contain rounded-lg`; `e.stopPropagation()` on image click so only backdrop clicks close.
- `X` button (lucide-react) at `absolute top-4 right-4` with `h-11 w-11` = 44px touch target (D-17).
- Effect hook:
  - Locks `document.body.style.overflow = 'hidden'`, restores previous value on unmount
  - Adds `keydown` listener for `Escape` → `onClose()`, removed on unmount
- `role="dialog"`, `aria-modal="true"`, `aria-label="Просмотр изображения"` for accessibility.
- Commit: `777ca4c`

### Task 3 — `ImageAttachment.tsx`
- Three-state discriminated union: `{status: 'loading'} | {status: 'ready', url} | {status: 'error'}`.
- `useEffect` calls `getAttachmentUrl(path)` on mount with a `cancelled` guard to avoid setting state after unmount.
- Loading: `w-[240px] h-[180px] rounded-2xl bg-brand-primary-soft animate-pulse` skeleton.
- Error: compact bubble `px-3 py-2 rounded-2xl bg-brand-primary-soft text-xs text-brand-text-muted` — `"Не удалось загрузить изображение"`.
- Ready: `<button>` wrapping native `<img>` at `max-w-[320px] max-h-[320px] object-cover`. Click → `setLightboxOpen(true)` → renders `<ImageLightbox>`.
- All colors via `brand-*` tokens (D-03); no hex literals.
- Commit: `cf9a27f`

## Contracts

### `uploadAttachment(args)`
```typescript
uploadAttachment(args: {
  file: Blob
  fileName: string
  fileType: 'image' | 'file' | 'voice' | 'video_circle'
  groupId: string
  metadata?: { duration?: number; amplitudes?: number[] }
}): Promise<string>  // returns new message id
```
Throws `Error` on any of: `/api/upload` non-200, storage upload failure, `sendAttachment` failure.

### `<ImageAttachment path fileName />`
- Props: `{ path: string; fileName: string }`
- Self-contained: fetches signed URL, manages lightbox state.

### `<ImageLightbox src alt onClose />`
- Props: `{ src: string; alt: string; onClose: () => void }`
- Caller controls open/close via conditional render.

## Threat Model Coverage

| Threat ID | Status | Evidence |
|-----------|--------|----------|
| T-05-03-01 Token/path replay | accept | Signed upload URLs single-use + short TTL (Supabase-enforced) |
| T-05-03-02 XSS via file_name | mitigate | `fileName` flows only into React JSX `alt` and template-literal `aria-label` — auto-escaped. No `dangerouslySetInnerHTML` anywhere (verified). |
| T-05-03-03 Signed URL leak via devtools | accept | 1h TTL + existing tenant-wide SELECT RLS makes this acceptable for ~100-user corporate tool |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical] Added inline ESLint suppression for `<img>` elements**
- **Found during:** Tasks 2 and 3
- **Issue:** Next.js ESLint rule `@next/next/no-img-element` warns on native `<img>`. The plan explicitly mandates native `<img>` (not `next/image`) because signed URLs are dynamic and Next's optimizer requires domain whitelisting (RESEARCH §"Don't Hand-Roll").
- **Fix:** Added `{/* eslint-disable-next-line @next/next/no-img-element */}` immediately above each `<img>` tag — surgical, documented, and preserves the intentional architecture decision without blanket disables.
- **Files modified:** `ImageLightbox.tsx`, `ImageAttachment.tsx`
- **Commits:** `777ca4c`, `cf9a27f`

### Out-of-scope Observations (not fixed)
- `npm run lint` / `npm run build` not executed: documented Node v25 × Next 14 environment issue (see 05-01 SUMMARY — `eslint-config-next` ETIMEDOUT loading `react` plugin). Type validation via `npx tsc --noEmit` (clean, 0 errors).
- Pre-existing uncommitted modifications in working tree (`CLAUDE.md`, several chat components, `useRealtime.ts`, `reactions.ts`, `REVIEW.md`) left untouched — unrelated to Plan 05-03.

## Testing / Verification Status

| Check | Result |
|-------|--------|
| `test -f src/components/chat/attachments/uploadClient.ts` | PASS |
| `test -f src/components/chat/attachments/ImageLightbox.tsx` | PASS |
| `test -f src/components/chat/attachments/ImageAttachment.tsx` | PASS |
| Grep: `uploadToSignedUrl`, `sendAttachment`, `/api/upload` in uploadClient | PASS |
| Grep: `fixed inset-0`, `Escape`, `h-11 w-11` in ImageLightbox | PASS |
| Grep: `getAttachmentUrl`, `ImageLightbox`, `max-w-[320px]` in ImageAttachment | PASS |
| No `dangerouslySetInnerHTML` anywhere | PASS |
| No `any` types | PASS |
| No `next/image` import in ImageAttachment | PASS |
| `npx tsc --noEmit` | PASS (0 errors) |
| `npm run lint` | ENV BLOCKED (pre-existing, see 05-01) |
| `npm run build` | ENV BLOCKED (pre-existing, see 05-01) |

## Next Steps

- **Plan 05-07** (wiring) — imports `ImageAttachment` into `MessageBubble` inside a type-switch on `attachment.type === 'image'`; imports `uploadAttachment` into the attachment popup (from Plan 05-02) for the `🖼 Фото` option.
- **Plans 05-04, 05-05, 05-06** (file/voice/video) — reuse `uploadAttachment` helper for their respective flows.

## Self-Check: PASSED

- `src/components/chat/attachments/uploadClient.ts` — FOUND
- `src/components/chat/attachments/ImageLightbox.tsx` — FOUND
- `src/components/chat/attachments/ImageAttachment.tsx` — FOUND
- Commit `10571a2` — FOUND in git log
- Commit `777ca4c` — FOUND in git log
- Commit `cf9a27f` — FOUND in git log
- `npx tsc --noEmit` — 0 errors
