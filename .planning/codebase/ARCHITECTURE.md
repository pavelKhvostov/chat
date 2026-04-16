# Architecture

**Analysis Date:** 2026-04-15

## Pattern Overview

**Overall:** Next.js 14 App Router with Server Components as the primary rendering model, Server Actions as the exclusive data mutation layer, and Supabase Realtime for live message streaming.

**Key Characteristics:**
- Route Segments as feature boundaries — each URL segment owns its server-side data fetching
- Server Components fetch and pass serialized data to Client Components (never fetch on the client except Realtime)
- All DB writes go through `lib/actions/` Server Actions with `'use server'` directive
- Client state is local to the chat component; no global state manager

## Layers

**Routing Layer (App Router):**
- Purpose: URL-driven page composition, auth gating, data prefetching
- Location: `src/app/`
- Contains: Page Server Components, layouts, route groups
- Depends on: `lib/actions/`, `lib/supabase/server.ts`, components
- Used by: Browser navigation, Next.js router

**Server Actions Layer:**
- Purpose: All database reads and writes from the server; only way components interact with DB
- Location: `src/lib/actions/`
- Contains: `auth.ts`, `messages.ts`, `groups.ts`, `folders.ts`, `reactions.ts`
- Depends on: `lib/supabase/server.ts`, `lib/types/database.types.ts`
- Used by: Server Components (pages, layouts), Client Components (form/button handlers)

**Component Layer:**
- Purpose: Rendering and client-side interaction
- Location: `src/components/`
- Contains: `chat/` (ChatWindow, MessageList, MessageBubble, MessageInput), `sidebar/` (Sidebar, FolderList, ChatRow)
- Depends on: `lib/actions/` (for mutations), `hooks/` (for Realtime/Typing)
- Used by: Pages in `src/app/`

**Hooks Layer:**
- Purpose: Client-side Supabase subscriptions (Realtime + Presence)
- Location: `src/hooks/`
- Contains: `useRealtime.ts`, `useTyping.ts`
- Depends on: `lib/supabase/client.ts`
- Used by: `ChatWindow.tsx` exclusively

**Supabase Client Layer:**
- Purpose: Typed database client factory — separate instances for server and browser
- Location: `src/lib/supabase/`
- Contains: `server.ts` (cookie-based SSR client), `client.ts` (browser client)
- Depends on: `lib/types/database.types.ts`
- Used by: Actions (server client), Hooks (browser client)

## Data Flow

**Initial Page Load (Group Chat):**

1. Browser navigates to `/(main)/[groupId]`
2. `src/middleware.ts` validates session via `supabase.auth.getUser()`, redirects to `/login` if unauthenticated
3. `(main)/layout.tsx` calls `getUser()` (Server Action), renders `<Sidebar>` (Server Component)
4. `Sidebar` calls `getGroupsForUser()` + `getFoldersForUser()` + `getProfile()` in parallel
5. `[groupId]/page.tsx` calls `fetchMessages(groupId)` + member queries in parallel via `Promise.all`
6. Page renders `<ChatWindow>` with `initialMessages` and `memberProfiles` as props

**Realtime Message Flow:**

1. `ChatWindow` (Client Component) calls `useRealtime({ groupId, onInsert, onUpdate, onDelete })`
2. `useRealtime` subscribes to `postgres_changes` on `messages` table filtered by `group_id`
3. On INSERT: optimistic temp message is replaced with confirmed message from Realtime payload
4. On UPDATE/DELETE: `deleted_at` field is set on the corresponding message in local state
5. `markMessagesAsRead` Server Action is called for incoming messages

**Sending a Message:**

1. User types in `MessageInput` → `onTyping` callback → `useTyping.setTyping(true)` → Supabase Presence track
2. User submits → `ChatWindow.handleSend` adds optimistic message to local state immediately
3. `sendMessage(groupId, content, replyTo)` Server Action called → Supabase INSERT
4. Supabase Realtime fires INSERT event back → temp message replaced with real record
5. On error: temp message removed from local state

**Typing Indicator Flow:**

1. `useTyping` subscribes to `typing:{groupId}` Presence channel
2. Other users' presence state synced on `presence:sync` event
3. `typingUsers` array updated in `ChatWindow` state → displayed above `MessageInput`

**Auth Flow:**

1. Unauthenticated request → `middleware.ts` redirects to `/login`
2. `LoginPage` (`'use client'`) calls `signIn(formData)` Server Action on form submit
3. `signIn` calls `supabase.auth.signInWithPassword()` → sets session cookies → `revalidatePath` → `redirect('/')`
4. Admin-only routes (`/admin/*`): middleware fetches `profiles.role` and redirects non-admins to `/`
5. Authorized user on `/login` → middleware redirects to `/`
6. `signOut()` Server Action: clears session → redirect to `/login`

## Key Abstractions

**`MessageWithRelations` (type):**
- Purpose: Fully-hydrated message row with joined sender profile, reply context, reactions, and reads
- Defined in: `src/lib/actions/messages.ts`
- Used by: `ChatWindow`, `MessageList`, `MessageBubble`

**`GroupWithChildren` (type):**
- Purpose: Group row with nested `children[]` array for parent→subgroup tree
- Defined in: `src/lib/actions/groups.ts`
- Used by: `Sidebar`, `ChatRow`

**`FolderWithItems` (type):**
- Purpose: Folder row with resolved `items[]` each containing a full Group object
- Defined in: `src/lib/actions/folders.ts`
- Used by: `Sidebar`, `FolderList`

**`useRealtime` (hook):**
- Purpose: Single canonical Supabase Realtime subscription for a group channel — must not be duplicated
- Location: `src/hooks/useRealtime.ts`
- Pattern: Callback refs (`useRef`) prevent channel recreation on re-render; channel bound to `groupId`

**`useTyping` (hook):**
- Purpose: Supabase Presence-based typing indicator for a group
- Location: `src/hooks/useTyping.ts`
- Pattern: Separate channel `typing:{groupId}`, presence key = `currentUserId`

## Entry Points

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: All requests
- Responsibilities: HTML shell, Inter font, global dark background (`#0f0f1a`)

**Middleware:**
- Location: `src/middleware.ts`
- Triggers: Every non-static request (matcher excludes `_next/*`, images)
- Responsibilities: Session refresh, unauthenticated redirect, authenticated `/login` redirect, admin role gate

**Main Layout:**
- Location: `src/app/(main)/layout.tsx`
- Triggers: All routes inside `(main)` group
- Responsibilities: Auth double-check, renders `<Sidebar>` + `<main>` wrapper

**Auth Layout:**
- Location: `src/app/(auth)/layout.tsx`
- Triggers: `/login` route
- Responsibilities: Centered card layout for auth pages

## Error Handling

**Strategy:** Surface errors at the Server Action boundary; UI handles error state locally.

**Patterns:**
- Server Actions return `{ error: string }` objects for user-facing errors (see `signIn`, `createFolder`)
- Server Actions throw errors for unexpected failures (see `sendMessage`, `fetchMessages`)
- `ChatWindow` catches send failures and removes optimistic messages from state
- `LoginPage` holds local `error` state and displays it inline on `{ error }` result
- `middleware.ts` uses safe fallback: if profile fetch fails, non-admin behavior applies

## Cross-Cutting Concerns

**Logging:** `console.error` only for non-critical paths (e.g. `markMessagesAsRead` failure); no structured logging framework.

**Validation:** Input validation is implicit — Supabase RLS and DB constraints are the enforcement layer. No zod/yup schemas in place.

**Authentication:** Cookie-based JWT session managed by `@supabase/ssr`. Validated in middleware on every request and re-verified inside each Server Action via `supabase.auth.getUser()`.

**Authorization:** RLS enforced at DB level for all tables. Admin role additionally checked in middleware for `/admin/*` routes. Server Actions do not re-check admin role individually.

---

*Architecture analysis: 2026-04-15*
