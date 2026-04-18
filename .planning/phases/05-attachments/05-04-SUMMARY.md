---
phase: 05
plan: 04
subsystem: attachments-file-card
tags: [attachments, file, signed-url, download, client-component]
dependency_graph:
  requires: [05-01]
  provides: [file-attachment-renderer]
  affects: []
tech_stack:
  added: []
  patterns: [signed-URL-on-click, window.open-safe, brand-tokens, three-state-UX]
key_files:
  created:
    - src/components/chat/attachments/FileAttachment.tsx
  modified: []
decisions:
  - "Signed URL generated fresh on each click (not cached in component state) to avoid 1h TTL expiry (RESEARCH Pitfall 4)"
  - "window.open with 'noopener,noreferrer' features (not anchor with download attr) — lets Supabase Storage Content-Disposition drive download, avoids hydration baking URL into HTML, prevents tabnabbing"
  - "brand-primary-soft + brand-primary icon background for incoming bubble contrast; white/20 on outgoing bubble"
requirements: [ATT-02, ATT-07, ATT-08]
metrics:
  tasks_completed: 1
  files_created: 1
  files_modified: 0
  commits: 1
  completed_date: 2026-04-18
---

# Phase 05 Plan 04: File Attachment Card Summary

**One-liner:** `FileAttachment` client component — compact download card (icon + name + size) that fetches a fresh 1h signed URL via `getAttachmentUrl` on click and opens it in a new tab with `noopener,noreferrer`.

## What Was Built

### Task 1 — `src/components/chat/attachments/FileAttachment.tsx`
- Client component (`'use client'`) exporting named `FileAttachment({ path, fileName, fileSize, isOwn? })`.
- Renders a real `<button>` with `min-h-[44px] max-w-[280px]`:
  - `FileText` icon (Lucide, strokeWidth 1.75) in a 36×36 rounded tile
  - File name (`truncate`, single line) and `formatBytes(fileSize)` stacked
  - `Download` icon on the right; swaps to `Loader2 animate-spin` while loading
- State machine: `'idle' | 'loading' | 'error'` via `useState`.
  - Click → `getAttachmentUrl(path)` → `window.open(url, '_blank', 'noopener,noreferrer')` → back to `idle`
  - On error → shows "Ошибка загрузки" in the size slot for 3 s, then reverts
  - Double-click protection: re-entry blocked while `loading`
- Styling uses only brand tokens (no hardcoded hex):
  - incoming (`isOwn=false`): `bg-brand-surface shadow-card hover:shadow-card-hover`, name `text-brand-text`, muted `text-brand-text-muted`, icon wrap `bg-brand-primary-soft text-brand-primary`, chevron `text-brand-primary`
  - outgoing (`isOwn=true`): `bg-white/10 hover:bg-white/15`, name `text-white`, muted `text-white/70`, icon wrap `bg-white/20 text-white`, chevron `text-white/80`
- Accessibility: `aria-label="Скачать файл ${fileName}"`, `focus-visible:ring-2 focus-visible:ring-brand-primary`, `disabled` during load.
- Commit: `3105ecb`

## Contracts

```typescript
import { FileAttachment } from '@/components/chat/attachments/FileAttachment'

<FileAttachment
  path={att.path}             // message_attachments.path
  fileName={att.file_name}    // message_attachments.file_name
  fileSize={att.file_size}    // message_attachments.file_size (bytes)
  isOwn={isCurrentUser}       // boolean, optional, default false
/>
```

- No `onDownload` or `onError` callbacks exposed — intentional; side effects are internal.
- Component does not call `sendAttachment`; it is read-only for existing attachments.

## Threat Model Coverage

| Threat ID | Status | Evidence |
|-----------|--------|----------|
| T-05-04-01 Public URL leak | mitigate | Only `getAttachmentUrl` used → `createSignedUrl(path, 3600)`; no `getPublicUrl` reference in the component. |
| T-05-04-02 XSS via file_name | mitigate | Rendered through React JSX (auto-escaped). `aria-label` template literal also goes through React, auto-escaped. No `dangerouslySetInnerHTML`. |
| T-05-04-03 Reverse-tabnabbing | mitigate | `window.open(url, '_blank', 'noopener,noreferrer')` blocks `window.opener` access from the new tab. |
| T-05-04-04 Signed URL in memory | accept | 1 h TTL, not persisted. Acceptable for ~100-user internal tool (per threat model). |

## Deviations from Plan

None — plan executed exactly as written. Component file matches the `<action>` code block byte-for-byte after trailing whitespace normalization.

## Testing / Verification Status

| Check | Result |
|-------|--------|
| `test -f src/components/chat/attachments/FileAttachment.tsx` | PASS |
| `grep -q "getAttachmentUrl"` | PASS |
| `grep -q "formatBytes"` | PASS |
| `grep -q "window.open"` | PASS |
| `grep -q "noopener,noreferrer"` | PASS |
| `grep -q "min-h-\[44px\]"` | PASS |
| No `dangerouslySetInnerHTML` | PASS |
| `npx tsc --noEmit` | PASS (0 errors) |
| `npm run lint` | SKIPPED (Node v25 × Next 14 env issue — per execution_context) |
| `npm run build` | SKIPPED (same env constraint — per execution_context) |

## Next Steps

Plan **05-07** wires this component into `MessageBubble.tsx`:

```tsx
{att.type === 'file' && (
  <FileAttachment
    path={att.path}
    fileName={att.file_name}
    fileSize={att.file_size}
    isOwn={isOwn}
  />
)}
```

## Self-Check: PASSED

- `src/components/chat/attachments/FileAttachment.tsx` — FOUND
- Commit `3105ecb` — FOUND in git log (`git log --oneline -1` → `3105ecb feat(05-04): add FileAttachment card…`)
- All acceptance-criteria grep strings present in the file
- `npx tsc --noEmit` exited 0
