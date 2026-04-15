# Phase 3: Layout & Sidebar - Research

**Researched:** 2026-04-15
**Domain:** Next.js 14 App Router layout + Supabase server-side data fetching + collapsible sidebar UI
**Confidence:** HIGH

---

## Summary

Phase 3 builds the persistent shell of the application: a fixed `w-72` sidebar with a 2-level group tree and personal folders, and a content area that renders child routes. The sidebar data (groups, folders, folder_items) is fetched once per request in the Server Component layout; active-state highlighting is handled client-side via `usePathname`.

The existing `(main)/layout.tsx` already guards auth and wraps content in `flex h-screen bg-[#0f0f1a]`. This phase extends that layout to inject the `<Sidebar>` component alongside `{children}`. No new auth infrastructure is required — `createClient()` from `lib/supabase/server.ts` is already wired to cookies and is the correct fetch path.

The schema is fully defined. `groups` has `parent_id` (self-referential FK), `folders` has `user_id` + `position`, and `folder_items` links folders ↔ groups. All RLS is enabled. The data fetch pattern is: one server query for all groups the user is a member of, one for their folders with folder_items, then build the tree in-memory — no recursive SQL needed at 2-level depth.

**Primary recommendation:** Extend `(main)/layout.tsx` to fetch sidebar data server-side and render `<Sidebar>` as a Server Component; extract only the active-group highlight logic into a thin `'use client'` wrapper (`SidebarNav`). Use `useState` + CSS `transition` for collapsible folders — no third-party lib.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fetch groups + folders | Frontend Server (SSR) | — | RLS-protected data, no client exposure of keys |
| Render sidebar tree | Frontend Server (SSR) | — | Static structure, no interactivity |
| Active group highlight | Browser / Client | — | Requires `usePathname` (client hook) |
| Collapsible folder state | Browser / Client | — | UI state, no persistence needed |
| Move group to folder (GRP-03) | API / Backend (Server Action) | — | Mutates DB, must run server-side |
| Group header info (GRP-05) | Frontend Server (SSR) | — | Fetched in `[groupId]/page.tsx` or layout |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GRP-01 | Левая панель показывает список групп с иерархией (2 уровня) | Single query `groups` + `group_members`, build tree in-memory |
| GRP-02 | Личные папки отображаются в sidebar | Query `folders` + `folder_items` filtered by `user_id` |
| GRP-03 | Пользователь может перемещать группы в папки | Server Action `moveGroupToFolder` — upsert `folder_items` row |
| GRP-04 | Активная группа подсвечена в sidebar | `usePathname()` in `'use client'` `SidebarNav` component |
| GRP-05 | Название группы и кол-во участников в шапке чата | Query `groups` + `count(group_members)` in `[groupId]` layout/page |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 14 (already installed) | App Router nested layouts, Server Components | Project requirement |
| @supabase/ssr | already installed | Server-side Supabase client with cookie auth | Project requirement |
| Tailwind CSS | already installed | Utility styling | Project requirement |
| Lucide React | latest (needs install) | Icons for folders, groups, chevrons | CLAUDE.md requirement |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/navigation `usePathname` | built-in | Detect active route in client component | Active highlight only |
| next/navigation `useRouter` | built-in | Programmatic navigation | If needed for group switch |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom collapsible with useState | radix-ui Collapsible | Radix adds ~5KB, not needed for simple 2-level tree |
| Server Component sidebar | React Context for sidebar data | Context requires 'use client' boundary at layout level — loses RSC benefits |

**Installation:**
```bash
npm install lucide-react
```

**Version verification:** [ASSUMED] `lucide-react` current version is ~0.400+. Exact version pinned at install time.

---

## Architecture Patterns

### System Architecture Diagram

```
Browser Request: GET /[groupId]
        │
        ▼
(main)/layout.tsx  [Server Component]
  ├── getUser()            ← auth guard (already exists)
  ├── getSidebarData()     ← new: groups + folders fetch
  │       │
  │       ▼
  │   Supabase (RLS filters to current user)
  │       ├── groups JOIN group_members WHERE user_id = me
  │       └── folders + folder_items WHERE user_id = me
  │
  ├── <Sidebar data={sidebarData} />   [Server Component]
  │       └── <SidebarNav .../>        [Client Component — usePathname]
  │               ├── FolderList (collapsible, useState)
  │               └── GroupTree (2-level, active highlight)
  │
  └── <main>{children}</main>
            │
            ▼
      [groupId]/page.tsx  [Server Component]
          └── getGroupDetails(groupId)  ← groups + member count
```

### Recommended Project Structure
```
src/
  app/
    (main)/
      layout.tsx            # extends with Sidebar + data fetch
      page.tsx              # redirect to first group
      [groupId]/
        layout.tsx          # optional: group header (GRP-05)
        page.tsx            # chat content (Phase 4)
  components/
    sidebar/
      Sidebar.tsx           # Server Component — receives data props
      SidebarNav.tsx        # 'use client' — usePathname, folder collapse
      GroupTree.tsx         # pure render, receives groups[]
      FolderList.tsx        # pure render + collapse state
  lib/
    actions/
      groups.ts             # getGroupsForUser, moveGroupToFolder
      folders.ts            # getFoldersForUser, createFolder
```

### Pattern 1: Server Component Layout fetches sidebar data

The `(main)/layout.tsx` is already a Server Component. Extend it to fetch and pass sidebar data:

```typescript
// src/app/(main)/layout.tsx
import { getUser } from '@/lib/actions/auth'
import { getSidebarData } from '@/lib/actions/groups'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { redirect } from 'next/navigation'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  const { groups, folders } = await getSidebarData(user.id)

  return (
    <div className="flex h-screen bg-[#0f0f1a] text-white overflow-hidden">
      <Sidebar groups={groups} folders={folders} userId={user.id} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
```

[ASSUMED] Pattern aligns with Next.js 14 App Router Server Component conventions.

### Pattern 2: Single Supabase query for groups + hierarchy

Fetch all groups the user is a member of in one query, build 2-level tree in-memory:

```typescript
// src/lib/actions/groups.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/lib/types/database.types'

type Group = Tables<'groups'>

export async function getSidebarData(userId: string) {
  const supabase = await createClient()

  // RLS on group_members ensures only accessible groups are returned
  const { data: memberRows } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)

  const groupIds = memberRows?.map(r => r.group_id) ?? []

  const { data: groups } = await supabase
    .from('groups')
    .select('*')
    .in('id', groupIds)
    .order('name')

  const { data: folders } = await supabase
    .from('folders')
    .select('*, folder_items(group_id, position)')
    .eq('user_id', userId)
    .order('position')

  return { groups: groups ?? [], folders: folders ?? [] }
}
```

**In-memory tree building** (no recursive SQL needed at 2 levels):
```typescript
function buildGroupTree(groups: Group[]) {
  const roots = groups.filter(g => g.parent_id === null)
  return roots.map(root => ({
    ...root,
    children: groups.filter(g => g.parent_id === root.id),
  }))
}
```

[ASSUMED] This pattern is idiomatic for the project's established Server Action style.

### Pattern 3: Active highlight with usePathname

```typescript
// src/components/sidebar/SidebarNav.tsx
'use client'
import { usePathname } from 'next/navigation'

export function GroupLink({ groupId, name }: { groupId: string; name: string }) {
  const pathname = usePathname()
  const isActive = pathname === `/${groupId}`

  return (
    <a
      href={`/${groupId}`}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-md text-sm
        transition-colors duration-150
        ${isActive
          ? 'bg-indigo-500/20 text-indigo-300'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }
      `}
    >
      {name}
    </a>
  )
}
```

[ASSUMED] `usePathname` is stable in Next.js 14 and is the canonical way to detect active routes in client components.

### Pattern 4: Collapsible folder without a library

```typescript
'use client'
import { useState } from 'react'
import { ChevronRight, Folder } from 'lucide-react'

export function FolderItem({ folder, children }: FolderItemProps) {
  const [open, setOpen] = useState(true)

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-medium
                   text-slate-500 uppercase tracking-wider hover:text-slate-300
                   transition-colors duration-150"
      >
        <ChevronRight
          size={12}
          className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
        />
        <Folder size={12} />
        {folder.name}
      </button>
      {open && <div className="pl-4">{children}</div>}
    </div>
  )
}
```

### Pattern 5: Server Action — move group to folder (GRP-03)

```typescript
// src/lib/actions/folders.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function moveGroupToFolder(groupId: string, folderId: string) {
  const supabase = await createClient()

  // RLS: user can only write folder_items for their own folders
  const { error } = await supabase
    .from('folder_items')
    .upsert({ folder_id: folderId, group_id: groupId, position: 0 },
             { onConflict: 'folder_id,group_id' })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')  // refresh sidebar
  return { success: true }
}
```

### Anti-Patterns to Avoid

- **Fetching groups inside each page.tsx:** The sidebar is layout-level data — fetch once in `(main)/layout.tsx`, pass down as props. Fetching per-page causes redundant DB calls on every navigation.
- **Putting `usePathname` in a Server Component:** Causes build error. Always isolate client hooks in leaf components (`GroupLink`, `SidebarNav`).
- **Using React Context for sidebar state at the layout level:** Forces the entire `(main)` layout into a client boundary, losing Server Component benefits for data fetching.
- **Subscribing to Realtime in the sidebar (this phase):** Realtime is Phase 4 scope. Don't add Supabase Realtime subscriptions here.
- **Using `any` type:** CLAUDE.md explicitly forbids `any`. Use `Tables<'groups'>`, `Tables<'folders'>` from database.types.ts.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Active link detection | Manual URL string parsing | `usePathname()` from next/navigation | Handles query params, dynamic segments correctly |
| Icon set | Custom SVGs | `lucide-react` | Consistent stroke-width, tree-shakeable, CLAUDE.md requirement |
| Type definitions | Manual interfaces | `Tables<'groups'>` from database.types.ts | Auto-generated, stays in sync with schema |
| Auth check in layout | Manual cookie parse | `getUser()` from lib/actions/auth | Already implemented, tested pattern |

---

## Common Pitfalls

### Pitfall 1: Stale sidebar after folder/group mutation
**What goes wrong:** User moves a group to a folder; sidebar still shows old state.
**Why it happens:** Next.js caches Server Component renders. Without revalidation the layout doesn't re-fetch.
**How to avoid:** Call `revalidatePath('/', 'layout')` in every Server Action that mutates `folder_items` or `folders`.
**Warning signs:** UI doesn't update after action returns success.

### Pitfall 2: Incorrect boundary — client component wrapping server component
**What goes wrong:** `Sidebar.tsx` marked `'use client'` to use `usePathname`, but then can't import Server Components inside it (e.g., sub-components that do async data fetch).
**Why it happens:** Once a component is client, its subtree must also be client-compatible.
**How to avoid:** Keep `Sidebar.tsx` as a Server Component. Push `'use client'` down to the smallest leaf that needs it (`GroupLink`, `FolderItem`).

### Pitfall 3: groups query returns parent groups the user isn't a member of
**What goes wrong:** A parent group (e.g. "Engineering") has no group_members row for the user, but subgroup ("Frontend") does. The parent doesn't appear in the query result, so the tree can't be built correctly.
**Why it happens:** Membership is per-group, not hierarchical. RLS only returns rows where `user_id` matches.
**How to avoid:** When building the tree, also include parent groups of any group the user is in. Fetch by `id IN (memberGroupIds) OR id IN (parentIdsOfMemberGroups)`. Or fetch all groups + filter by membership in-memory after.

### Pitfall 4: `cookies()` called at wrong time in server.ts
**What goes wrong:** `createClient()` errors with "cookies was called outside a request scope."
**Why it happens:** `createClient()` must be called inside an async Server Component or Server Action, not at module level.
**How to avoid:** Always call `const supabase = await createClient()` inside the function body. The existing pattern in `auth.ts` is correct — follow it exactly.

---

## Code Examples

### Verified patterns from official sources

#### Supabase server client (already in codebase — use as-is)
```typescript
// src/lib/supabase/server.ts — already correct, don't modify
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
// ...
```
[VERIFIED: codebase — src/lib/supabase/server.ts]

#### Database types usage
```typescript
import type { Tables } from '@/lib/types/database.types'
// [VERIFIED: codebase — src/lib/types/database.types.ts exports Tables helper]

type Group = Tables<'groups'>
// Group.id, Group.name, Group.parent_id, Group.description are all typed
```

#### Folder with folder_items join (Supabase nested select)
```typescript
const { data: folders } = await supabase
  .from('folders')
  .select('*, folder_items(group_id, position)')
  .eq('user_id', userId)
  .order('position')
// Returns: Array<{ id, name, position, user_id, created_at, folder_items: Array<{group_id, position}> }>
```
[ASSUMED] Supabase nested select syntax — standard PostgREST embedding pattern.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getServerSideProps` for sidebar data | Server Component async fetch in layout | Next.js 13+ | No separate data-fetching lifecycle; layout IS the data fetcher |
| `next/router` useRouter for active path | `next/navigation` usePathname | Next.js 13 | Separate hook for reading vs navigating |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `lucide-react` is not yet installed | Standard Stack | If already installed, install step is no-op (safe) |
| A2 | In-memory 2-level tree building is sufficient (no 3+ levels) | Architecture Patterns | Schema supports deeper nesting; CLAUDE.md spec says 2 levels — safe assumption |
| A3 | `revalidatePath('/', 'layout')` revalidates the sidebar data | Common Pitfalls | If cache strategy differs, sidebar may need different revalidation scope |
| A4 | Supabase nested select `folder_items(group_id, position)` works as written | Code Examples | Standard PostgREST syntax — very likely correct |

---

## Open Questions

1. **Parent group membership for tree display**
   - What we know: Groups have `parent_id`. The user may be a member of a subgroup but not the parent.
   - What's unclear: Should parent groups be shown in the sidebar even if the user isn't explicitly a member?
   - Recommendation: Fetch all groups, include any group whose `id` is in the user's membership list OR whose `id` is a `parent_id` of a group in the membership list. Avoids orphaned subgroups in the tree.

2. **`(main)/page.tsx` redirect target**
   - What we know: The root `/` page should redirect to the first group.
   - What's unclear: "First group" by what ordering — alphabetical, creation date, position?
   - Recommendation: Redirect to first group ordered by `name` — consistent and predictable.

---

## Environment Availability

Step 2.6: SKIPPED — this phase has no external dependencies beyond the already-installed Next.js + Supabase stack. `lucide-react` is a pure npm package with no environment requirements.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Not detected (no jest.config, vitest.config, or test files found) |
| Config file | none — see Wave 0 |
| Quick run command | `npm run lint` (static validation until test framework added) |
| Full suite command | `npm run build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GRP-01 | Sidebar renders groups with 2-level hierarchy | manual/smoke | `npm run build` (type-check) | ❌ Wave 0 |
| GRP-02 | Personal folders display in sidebar | manual/smoke | `npm run build` | ❌ Wave 0 |
| GRP-03 | Move group to folder action mutates DB | unit (server action) | — | ❌ Wave 0 |
| GRP-04 | Active group is highlighted | manual/smoke | `npm run lint` | ❌ Wave 0 |
| GRP-05 | Group name + member count shown in header | manual/smoke | `npm run build` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run lint`
- **Per wave merge:** `npm run build`
- **Phase gate:** `npm run build` green + manual browser smoke test before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] No test framework installed — for this phase, `npm run build` (TypeScript compile) serves as the primary correctness gate
- [ ] If unit tests desired: `npm install -D vitest @vitejs/plugin-react` and create `vitest.config.ts`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `getUser()` server action — already implemented |
| V3 Session Management | no | Handled in Phase 2 middleware |
| V4 Access Control | yes | Supabase RLS on `groups`, `folders`, `folder_items` |
| V5 Input Validation | yes | Server Actions validate inputs before DB write |
| V6 Cryptography | no | No new crypto in this phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| User reads another user's folders via direct API | Information Disclosure | RLS on `folders` WHERE `user_id = auth.uid()` |
| User moves groups into another user's folder | Tampering | RLS on `folder_items` — check folder ownership before insert |
| Unauthenticated access to sidebar data | Elevation of Privilege | `getUser()` guard in layout + RLS double-checks at DB layer |

**Critical:** `moveGroupToFolder` Server Action must verify the `folderId` belongs to the current user before writing `folder_items`. RLS is the last line, but application-level checks prevent confusing error states.

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase] `src/app/(main)/layout.tsx` — existing layout structure
- [VERIFIED: codebase] `src/lib/supabase/server.ts` — `createClient()` pattern
- [VERIFIED: codebase] `src/lib/actions/auth.ts` — Server Action patterns to follow
- [VERIFIED: codebase] `src/lib/types/database.types.ts` — full schema including `groups.parent_id`, `folders`, `folder_items`

### Secondary (MEDIUM confidence)
- [ASSUMED] Next.js 14 App Router nested layout + Server Component patterns — based on training knowledge of Next.js 13/14 conventions

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all core libraries already in project
- Architecture: HIGH — patterns derived directly from existing codebase conventions
- Pitfalls: MEDIUM — based on known Next.js/Supabase gotchas, not project-specific testing

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (stable stack)
