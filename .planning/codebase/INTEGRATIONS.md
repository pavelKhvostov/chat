# External Integrations

**Analysis Date:** 2026-04-15

## APIs & External Services

**Backend-as-a-Service:**
- Supabase - primary backend (auth, database, realtime, storage)
  - SDK: `@supabase/supabase-js` ^2.103.2 + `@supabase/ssr` ^0.10.2
  - Auth env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Service role: `SUPABASE_SERVICE_ROLE_KEY` (server-only, admin operations)

## Data Storage

**Database:**
- PostgreSQL via Supabase
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`
  - Client: Supabase JS client (no ORM - raw table queries via `.from()`)
  - Extension: `pgcrypto` (for `gen_random_uuid()`)
  - Migrations: `supabase/migrations/` (5 migration files)

**Schema tables (from migrations):**

| Migration | Tables |
|-----------|--------|
| `00001_core_users_groups.sql` | `profiles`, `groups`, `group_members`, `folders`, `folder_items` |
| `00002_messages.sql` | `messages`, `message_reads`, `message_reactions`, `message_attachments`, `pinned_messages` |
| `00003_direct_messages.sql` | `direct_chats`, `direct_chat_members`, `direct_messages`, `direct_message_reads`, `direct_message_attachments` |
| `00004_rls_policies.sql` | RLS policies on all tables |
| `00005_storage_realtime_indexes.sql` | Storage bucket, Realtime config, indexes |

**File Storage:**
- Supabase Storage, bucket: `attachments` (private)
  - RLS: authenticated users can SELECT any attachment; INSERT/DELETE only own files (folder = `auth.uid()`)
  - Attachment types allowed: `image`, `file`, `voice`, `video_circle`
  - Upload route: `/api/upload` (Next.js API route - not direct client upload)

**Caching:**
- None

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (email/password)
  - Client-side: `src/lib/supabase/client.ts` - `createBrowserClient` from `@supabase/ssr`
  - Server-side: `src/lib/supabase/server.ts` - `createServerClient` with cookie store
  - Middleware: `src/middleware.ts` - session refresh + route protection

**Session Management:**
- Cookie-based sessions via `@supabase/ssr`
- Middleware runs on every non-static request, refreshes session and enforces:
  - Unauthenticated → redirect to `/login`
  - Authenticated on `/login` → redirect to `/`
  - `/admin/*` → requires `profiles.role = 'admin'` (checked server-side)

**User Profile:**
- `profiles` table linked to `auth.users` via `id` (UUID, CASCADE delete)
- Fields: `email`, `display_name`, `avatar_url`, `role` (`admin`|`user`), `is_active`

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- Next.js default server logs only

## CI/CD & Deployment

**Hosting:**
- Vercel (per CLAUDE.md)

**CI Pipeline:**
- None detected (no `.github/workflows/` or similar)

## Realtime

**Provider:** Supabase Realtime (PostgreSQL logical replication)

**Published tables** (from `00005_storage_realtime_indexes.sql`):
- `messages` - group chat messages
- `direct_messages` - DM messages
- `message_reactions` - emoji reactions
- `message_reads` - read receipts

**Client hook:** `hooks/useRealtime` - single subscription point (no duplicate subscriptions allowed per CLAUDE.md)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public, used client + server)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (public, used client + server)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-only, never expose to client)

**Secrets location:**
- `.env.local` (not committed to git)

---

*Integration audit: 2026-04-15*
