---
phase: 05
plan: 01
subsystem: attachments-foundation
tags: [upload, storage, supabase, server-action, api-route, signed-url]
dependency_graph:
  requires: [phase-04-chat-realtime]
  provides: [attachments-upload-infrastructure, signed-upload-url, send-attachment-action, message-attachments-join]
  affects: [src/components/chat/ChatWindow.tsx, src/lib/actions/messages.ts]
tech_stack:
  added: []
  patterns: [createSignedUploadUrl, uploadToSignedUrl, Server Actions, is_group_member RPC]
key_files:
  created:
    - supabase/migrations/00007_attachments_metadata.sql
    - src/lib/utils/formatBytes.ts
    - src/lib/actions/attachments.ts
    - src/app/api/upload/route.ts
  modified:
    - src/lib/types/database.types.ts
    - src/lib/actions/messages.ts
    - src/components/chat/ChatWindow.tsx
decisions:
  - "Metadata cast via unknown → Json to bridge AttachmentMetadata interface and generated Supabase Json type (no `any`)"
  - "Type hand-edited in database.types.ts because supabase CLI push requires user auth (user_setup gate)"
requirements: [ATT-01, ATT-02, ATT-08]
metrics:
  tasks_completed: 3
  files_created: 4
  files_modified: 3
  commits: 3
  completed_date: 2026-04-18
---

# Phase 05 Plan 01: Attachments Foundation Summary

**One-liner:** Upload infrastructure foundation — metadata column, `/api/upload` signed URL route, `sendAttachment`/`getAttachmentUrl` Server Actions, `formatBytes` util, and `MessageWithRelations.attachments` join for downstream Wave 2 plans.

## What Was Built

### Task 1 — Migration 00007 + types
- `supabase/migrations/00007_attachments_metadata.sql` adds `metadata jsonb DEFAULT NULL` to both `message_attachments` and `direct_message_attachments`.
- `src/lib/types/database.types.ts` extended manually (user_setup gate: `supabase db push` and `gen types` require auth): `metadata: Json | null` in Row/Insert/Update for both attachment tables.
- No RLS changes (D-15, CLAUDE.md — existing per-row policies cover the new column implicitly).
- Commit: `f57ad89`

### Task 2 — formatBytes + attachments Server Actions
- `src/lib/utils/formatBytes.ts` — `formatBytes(bytes)` returning Russian units: `"500 Б"`, `"2.0 КБ"`, `"5.0 МБ"`.
- `src/lib/actions/attachments.ts` (server-only):
  - `sendAttachment(payload)` — auth gate, creates empty-content `messages` row, inserts `message_attachments` row with metadata; returns new message id.
  - `getAttachmentUrl(path)` — returns `createSignedUrl(path, 3600)` signed URL (1h TTL).
  - Exported types: `AttachmentType`, `AttachmentPayload`, `AttachmentMetadata`.
  - Metadata bridging: `payload.metadata as unknown as Json` (no `any`).
- Commit: `f6b1b24`

### Task 3 — /api/upload route + fetchMessages join
- `src/app/api/upload/route.ts` POST handler:
  - `auth.getUser()` → 401 if missing
  - `supabase.rpc('is_group_member', { p_group_id })` → 403 if not member
  - `SIZE_LIMITS` by `fileType`: image 10 MB, voice 5 MB, video_circle 30 MB, file 50 MB → 413 on violation
  - `fileType` not in whitelist → 400
  - `sanitizeFileName` strips `/`, `\`, control chars and caps at 200 chars
  - Path built server-side: `${user.id}/${groupId}/${Date.now()}_${safeName}` — client-supplied path never accepted (T-05-01-02 mitigation)
  - Returns `{ signedUrl, token, path }` on success
- `src/lib/actions/messages.ts`:
  - `MessageWithRelations` now has `attachments: Pick<Tables<'message_attachments'>, 'id' | 'path' | 'type' | 'file_name' | 'file_size' | 'metadata'>[]`
  - `fetchMessages` select joins `attachments:message_attachments(id, path, type, file_name, file_size, metadata)`
- `src/components/chat/ChatWindow.tsx` — three object literals cast to `MessageWithRelations` updated with `attachments: []` (Rule 3 blocker fix from new required field).
- Commit: `587fc92`

## Contracts

### `/api/upload` POST
**Request:** `{ fileName: string, fileSize: number, fileType: 'image'|'file'|'voice'|'video_circle', groupId: string }`

**Responses:**
| Status | Body | Trigger |
|--------|------|---------|
| 200 | `{ signedUrl, token, path }` | Authorized member, valid size and type |
| 400 | `{ error: 'Invalid JSON' \| 'Missing fields' \| 'Invalid file type' }` | Malformed/unsupported input |
| 401 | `{ error: 'Unauthorized' }` | No session |
| 403 | `{ error: 'Forbidden' }` | Not a group_members row for groupId |
| 413 | `{ error: 'File too large' }` | `fileSize <= 0` or `fileSize > SIZE_LIMITS[fileType]` |
| 500 | `{ error: <storage-error-message> }` | `createSignedUploadUrl` failure |

### Server Action signatures
```typescript
sendAttachment(payload: {
  groupId: string
  path: string
  fileName: string
  fileSize: number
  type: 'image' | 'file' | 'voice' | 'video_circle'
  metadata?: { duration?: number; amplitudes?: number[] }
}): Promise<string>   // returns new message id

getAttachmentUrl(path: string): Promise<string>   // 1h signed URL

formatBytes(bytes: number): string   // "500 Б" | "2.0 КБ" | "5.0 МБ"
```

### `MessageWithRelations.attachments`
```typescript
attachments: Array<{
  id: string
  path: string
  type: string
  file_name: string
  file_size: number
  metadata: Json | null
}>
```

## Threat Model Coverage

All threats from PLAN `<threat_model>` are mitigated or accepted in the implementation:

| Threat ID | Status | Evidence |
|-----------|--------|----------|
| T-05-01-01 Tampering groupId | mitigate | `is_group_member` RPC, 403 on false |
| T-05-01-02 Tampering fileName / path traversal | mitigate | `sanitizeFileName` + server-built path |
| T-05-01-03 DoS fileSize | mitigate | `SIZE_LIMITS` check, 413 on violation |
| T-05-01-04 Spoofing caller | mitigate | `auth.getUser()` from SSR cookies, 401 on absence |
| T-05-01-05 Path guessing | accept | Private bucket + unguessable path (user.id + groupId + Date.now()) |
| T-05-01-06 sendAttachment bypass | mitigate | RLS on `messages`: `is_group_member(group_id) AND sender_id = auth.uid()` |
| T-05-01-07 fileType forgery | accept | Documented in plan; 50 MB absolute bucket cap |
| T-05-01-08 XSS via file_name | mitigate | Rendered via React JSX in downstream plans; enforced in acceptance criteria of 05-03/05-04 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] TypeScript type error in ChatWindow after extending MessageWithRelations**
- **Found during:** Task 3 (after extending `MessageWithRelations` with `attachments`)
- **Issue:** Three object literals in `src/components/chat/ChatWindow.tsx` were cast `as MessageWithRelations`, omitting the new required `attachments` field → `npx tsc --noEmit` reported 3 errors (TS2352, TS2322).
- **Fix:** Added `attachments: []` to realtime-inserted messages (lines 81, 84) and to optimistic-send literal (line ~194).
- **Files modified:** `src/components/chat/ChatWindow.tsx`
- **Commit:** `587fc92`

**2. [Rule 1 - Bug] TypeScript rejected `AttachmentMetadata` as `Json`**
- **Found during:** Task 2
- **Issue:** Supabase-generated `Json` type's object variant has `[key: string]: Json | undefined` index signature. Our `AttachmentMetadata` interface has no index signature, so direct assignment failed (TS2769).
- **Fix:** Added `metadataJson: Json | null = payload.metadata ? (payload.metadata as unknown as Json) : null` intermediate variable. No `any` introduced; the `unknown` bridge is the standard TS idiom for structural-to-signature coercion.
- **Files modified:** `src/lib/actions/attachments.ts`
- **Commit:** `f6b1b24`

### Out-of-scope Observations (not fixed)
- `npm run lint` cannot run in this environment because `eslint-config-next` fails to load the `react` plugin with `ETIMEDOUT` (network). Already flagged in execution_context as Node v25 compat issue — type validation performed via `npx tsc --noEmit` (passes clean). Not caused by this plan.
- Pre-existing uncommitted modifications in working tree (`CLAUDE.md`, `src/lib/actions/reactions.ts`, `.planning/STATE.md`, `.planning/phases/04-chat-realtime/REVIEW.md`) left untouched — unrelated to Plan 05-01.

## User Setup Required (pre-Wave-2 gate)

Before Wave 2 plans (05-02 through 05-07) can be executed against a live DB:

1. `npx supabase login` (CLI auth) — or set `SUPABASE_ACCESS_TOKEN` env var for hosted project
2. `npx supabase db push` — applies migration 00007 to linked project
3. (Optional, to refresh types if linked to cloud) `npx supabase gen types typescript --local > src/lib/types/database.types.ts` — this plan already hand-edited the types, so regenerating is only needed if the linked DB drifts
4. Verify Storage bucket `attachments` exists in the target project (migration 00005 creates it locally; for cloud, confirm in Dashboard → Storage)

## Testing / Verification Status

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS (0 errors) |
| Files exist | PASS (all 4 created, all 3 modified) |
| Grep acceptance strings | PASS (all literal strings from acceptance_criteria present) |
| `npm run lint` | ENV BLOCKED (eslint-config-next ETIMEDOUT — pre-existing Node v25 issue) |
| Migration applied to live DB | PENDING user_setup (step 2 above) |
| End-to-end upload test | PENDING downstream plan (05-02 wires `/api/upload` from client UI) |

## Next Steps

Downstream Wave 2 plans consuming this foundation:
- **05-02** (Attachment popup + MessageInput integration) — will call `/api/upload` + `uploadToSignedUrl` from client
- **05-03** (Image attachments + lightbox) — uses `sendAttachment({ type: 'image', ... })` and `getAttachmentUrl` for render
- **05-04** (File attachments) — uses `FileAttachment` with `formatBytes` for display
- **05-05** (Voice messages) — uses `sendAttachment({ type: 'voice', metadata: { amplitudes, duration } })`
- **05-06** (Video circles) — uses `sendAttachment({ type: 'video_circle', metadata: { duration } })`

## Self-Check: PASSED

- `supabase/migrations/00007_attachments_metadata.sql` — FOUND
- `src/lib/utils/formatBytes.ts` — FOUND
- `src/lib/actions/attachments.ts` — FOUND
- `src/app/api/upload/route.ts` — FOUND
- `src/lib/types/database.types.ts` — FOUND (modified: metadata: Json | null x2)
- `src/lib/actions/messages.ts` — FOUND (modified: attachments field + select join)
- `src/components/chat/ChatWindow.tsx` — FOUND (modified: attachments: [] in 3 literals)
- Commit `f57ad89` — FOUND in git log
- Commit `f6b1b24` — FOUND in git log
- Commit `587fc92` — FOUND in git log
- `npx tsc --noEmit` — 0 errors
