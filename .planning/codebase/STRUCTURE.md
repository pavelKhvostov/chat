# Codebase Structure

**Analysis Date:** 2026-04-15

## Directory Layout

```
vcusnochat/
├── src/
│   ├── app/                        # Next.js App Router — pages, layouts, API routes
│   │   ├── (auth)/                 # Route group: unauthenticated pages (no shared layout overlap)
│   │   │   ├── layout.tsx          # Centered card layout for auth pages
│   │   │   └── login/
│   │   │       └── page.tsx        # Login form — 'use client', calls signIn Server Action
│   │   ├── (main)/                 # Route group: authenticated app shell
│   │   │   ├── layout.tsx          # Auth guard + Sidebar + <main> wrapper
│   │   │   ├── page.tsx            # Index — redirects to first available group
│   │   │   └── [groupId]/
│   │   │       └── page.tsx        # Group chat page — fetches messages + members server-side
│   │   ├── layout.tsx              # Root layout — HTML, Inter font, dark bg
│   │   ├── globals.css             # Global Tailwind base styles
│   │   └── fonts/                  # GeistVF.woff, GeistMonoVF.woff (loaded locally)
│   │
│   ├── components/
│   │   ├── chat/                   # Chat feature components (all 'use client')
│   │   │   ├── ChatWindow.tsx      # Main orchestrator: state, Realtime, optimistic updates
│   │   │   ├── MessageList.tsx     # Scrollable virtualized message list, infinite scroll
│   │   │   ├── MessageBubble.tsx   # Single message: bubble, reply quote, reactions, actions
│   │   │   └── MessageInput.tsx    # Text input, reply banner, typing emission
│   │   └── sidebar/                # Sidebar feature components (mixed server/client)
│   │       ├── Sidebar.tsx         # Server Component: fetches groups, folders, profile
│   │       ├── FolderList.tsx      # Renders collapsible folder sections with grouped ChatRows
│   │       └── ChatRow.tsx         # Single group row in sidebar list (active state, subgroup indent)
│   │
│   ├── hooks/                      # React hooks for Supabase client-side subscriptions
│   │   ├── useRealtime.ts          # Postgres CDC subscription for group messages channel
│   │   └── useTyping.ts            # Supabase Presence typing indicator for a group
│   │
│   ├── lib/
│   │   ├── actions/                # ALL Server Actions — exclusive data access layer
│   │   │   ├── auth.ts             # signIn, signOut, getUser, getProfile
│   │   │   ├── messages.ts         # fetchMessages, sendMessage, deleteMessage, markMessagesAsRead
│   │   │   ├── groups.ts           # getGroupsForUser, getFirstGroupId
│   │   │   ├── folders.ts          # getFoldersForUser, createFolder, moveGroupToFolder, deleteFolder
│   │   │   └── reactions.ts        # toggleReaction
│   │   ├── supabase/               # Supabase client factories
│   │   │   ├── server.ts           # createClient() — cookie-based SSR client (for Server Actions + Server Components)
│   │   │   └── client.ts           # createClient() — browser client (for hooks only)
│   │   └── types/
│   │       └── database.types.ts   # Generated Supabase types — do NOT hand-edit
│   │
│   └── middleware.ts               # Session validation, auth redirect, admin route guard
│
├── supabase/
│   ├── migrations/                 # SQL migration files — applied via `supabase db push`
│   └── .temp/                      # Supabase CLI temp files — not committed
│
├── .planning/
│   ├── phases/                     # GSD phase plan files
│   └── codebase/                   # Codebase map documents (this directory)
│
├── .claude/
│   └── agents/                     # Agent configuration files
│
├── CLAUDE.md                       # Project instructions and conventions
├── next.config.ts                  # Next.js configuration
├── tailwind.config.ts              # Tailwind configuration
├── tsconfig.json                   # TypeScript configuration with path aliases
└── package.json                    # Dependencies and scripts
```

## Directory Purposes

**`src/app/(auth)/`:**
- Purpose: Pages accessible without authentication
- Contains: Login page only — can be extended with registration/reset if needed
- Key files: `login/page.tsx` (Client Component — calls Server Action)

**`src/app/(main)/`:**
- Purpose: Authenticated application shell — all real app pages live here
- Contains: Main layout (with Sidebar), index redirect, group chat pages
- Key files: `layout.tsx` (server auth check), `[groupId]/page.tsx` (data-fetching entry)

**`src/components/chat/`:**
- Purpose: All components for the message view
- Contains: Client Components only — manage local state and Realtime subscriptions
- Key files: `ChatWindow.tsx` is the root; it owns all message state and passes down to `MessageList` and `MessageInput`

**`src/components/sidebar/`:**
- Purpose: Navigation panel — groups, folders, user profile
- Contains: `Sidebar.tsx` is a Server Component; sub-components may be client
- Key files: `Sidebar.tsx` fetches all sidebar data in one parallel Promise.all

**`src/hooks/`:**
- Purpose: Encapsulate Supabase browser-client subscriptions
- Contains: `useRealtime.ts` (CDC), `useTyping.ts` (Presence)
- Rule: All Realtime subscriptions must go through these hooks — do not create raw Supabase channels in components

**`src/lib/actions/`:**
- Purpose: The only place DB queries live — Server Actions called from both Server and Client Components
- Contains: One file per domain (auth, messages, groups, folders, reactions)
- Rule: Every file starts with `'use server'`. No direct Supabase queries in components.

**`src/lib/supabase/`:**
- Purpose: Typed Supabase client factories — two separate files for two environments
- Rule: Use `server.ts` in Server Actions and Server Components. Use `client.ts` only in hooks.

**`src/lib/types/`:**
- Purpose: Auto-generated database type definitions
- Rule: Always regenerate with `supabase gen types typescript --local > src/lib/types/database.types.ts`. Never edit manually.

**`supabase/migrations/`:**
- Purpose: SQL migration history — applied in order by Supabase CLI
- Rule: All schema changes go through new migration files, never direct DB edits in production.

## Key File Locations

**Entry Points:**
- `src/middleware.ts`: First code to run on every request — session refresh and redirects
- `src/app/layout.tsx`: Root HTML wrapper
- `src/app/(main)/layout.tsx`: Authenticated shell with Sidebar

**Configuration:**
- `tsconfig.json`: Path alias `@/` → `./src/`
- `tailwind.config.ts`: Tailwind setup
- `next.config.ts`: Next.js config (check for PWA plugin when implementing)

**Core Logic:**
- `src/lib/actions/messages.ts`: `MessageWithRelations` type + all message operations
- `src/lib/actions/groups.ts`: Group tree building logic
- `src/hooks/useRealtime.ts`: The single Realtime channel pattern
- `src/components/chat/ChatWindow.tsx`: Optimistic update logic and message state

**Types:**
- `src/lib/types/database.types.ts`: Source of truth for all table row types — use `Tables<'table_name'>` helper

## Naming Conventions

**Files:**
- React components: PascalCase — `ChatWindow.tsx`, `MessageBubble.tsx`
- Hooks: camelCase with `use` prefix — `useRealtime.ts`, `useTyping.ts`
- Server Action modules: camelCase noun — `messages.ts`, `groups.ts`
- Supabase clients: lowercase — `server.ts`, `client.ts`

**Functions (Server Actions):**
- Pattern: camelCase verb + noun — `sendMessage`, `fetchMessages`, `toggleReaction`, `createFolder`, `deleteMessage`
- Auth actions: `signIn`, `signOut`, `getUser`, `getProfile`

**Database tables (Supabase):**
- snake_case plural — `messages`, `group_members`, `message_reactions`, `message_reads`, `folder_items`

**CSS:**
- Tailwind utility classes only — no custom CSS classes, no CSS modules

**TypeScript:**
- No `any` type — use `unknown` or proper generics
- Table types via `Tables<'table_name'>` from `database.types.ts`
- Extended/joined types defined as named exports in the relevant action file (e.g. `MessageWithRelations`, `GroupWithChildren`)

## Where to Add New Code

**New page (authenticated):**
- Create `src/app/(main)/[route]/page.tsx` — Server Component, fetch data inline or via action
- Add corresponding Server Action in `src/lib/actions/[domain].ts` if new DB queries needed

**New page (unauthenticated):**
- Create `src/app/(auth)/[route]/page.tsx`

**New feature component:**
- If chat-related: `src/components/chat/NewComponent.tsx`
- If sidebar-related: `src/components/sidebar/NewComponent.tsx`
- New feature area: create `src/components/[feature]/` directory

**New UI component (shared primitive):**
- `src/components/ui/` directory (not yet created — create it for shared Button, Modal, Avatar, Input etc.)

**New Server Action:**
- Add to existing domain file if same domain (e.g. pinning a message → `src/lib/actions/messages.ts`)
- Create new file for new domain (e.g. `src/lib/actions/admin.ts` for admin operations)
- Always add `'use server'` as first line
- Always call `supabase.auth.getUser()` to verify auth before any DB operation

**New DB subscription:**
- Add to `src/hooks/useRealtime.ts` if it's a message table event for the current group
- Create a new hook in `src/hooks/` for entirely different subscriptions

**New migration:**
- Create file in `supabase/migrations/` with timestamp prefix: `YYYYMMDDHHMMSS_description.sql`
- Apply with `supabase db push`
- Regenerate types: `supabase gen types typescript --local > src/lib/types/database.types.ts`

## Special Directories

**`.planning/`:**
- Purpose: GSD planning artifacts — phase plans and codebase maps
- Generated: No (human + agent authored)
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes
- Committed: No

**`supabase/.temp/`:**
- Purpose: Supabase CLI temporary files
- Generated: Yes
- Committed: No

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-04-15*
