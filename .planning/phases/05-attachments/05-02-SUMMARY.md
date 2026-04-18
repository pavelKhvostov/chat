---
phase: 05-attachments
plan: 02
subsystem: layout/responsive
tags: [responsive, mobile, layout, sidebar, drawer, touch-targets]
requires: []
provides:
  - ShellClient (client shell with SidebarDrawerContext + useSidebarDrawer hook)
  - SidebarDrawer (mobile slide-in wrapper; md:static inline on desktop)
  - hamburger toggle inside ChatWindow (md:hidden, ≥44px touch target)
affects:
  - src/app/(main)/layout.tsx (delegated to ShellClient)
  - src/components/chat/ChatWindow.tsx (hamburger + useSidebarDrawer hook)
tech-stack:
  added: []
  patterns:
    - React context for cross-component sidebar toggle (useSidebarDrawer)
    - Tailwind md: breakpoint drives responsive behavior CSS-only (no JS media queries)
    - usePathname auto-close-on-navigate for drawer UX
key-files:
  created:
    - src/components/layout/ShellClient.tsx
    - src/components/layout/SidebarDrawer.tsx
  modified:
    - src/app/(main)/layout.tsx
    - src/components/chat/ChatWindow.tsx
decisions:
  - Hamburger placed inside ChatWindow (client component) rather than [groupId]/page.tsx header (server component) — avoids splitting the server-render chain
  - Drawer width 320px on mobile (max 85vw) vs 360px on desktop for breathing room on small screens
  - Backdrop is a <button> element (a11y-friendly dismissal, keyboard/screen-reader accessible)
  - No JS viewport queries — pure Tailwind md: breakpoint, CSS transform transitions
metrics:
  duration: "~5min (files pre-staged by prior executor run)"
  completed: 2026-04-18
  tasks_completed: 2
  tasks_total: 3 (Task 3 is human-verify checkpoint — PENDING_USER_VERIFY)
---

# Phase 5 Plan 2: Responsive Shell + Mobile Sidebar Drawer Summary

Converted the always-visible 360px sidebar into a responsive shell: inline on desktop (≥768px), hidden behind a slide-in drawer with backdrop on mobile (<768px), toggled by a ≥44px hamburger button inside ChatWindow.

## Tasks

### Task 1: Create ShellClient + SidebarDrawer — COMPLETE (commit 91daa14)

Created two client layout primitives:

**`src/components/layout/ShellClient.tsx`**
- React context `SidebarDrawerContext` + `useSidebarDrawer()` hook exposing `{ isOpen, open, close, toggle }`
- Wraps children in flex row with `h-screen overflow-hidden bg-brand-bg`
- `useEffect` on `usePathname()` auto-closes drawer on route change (tapping a chat navigates + closes)
- Throws a clear error if `useSidebarDrawer` is used outside the provider

**`src/components/layout/SidebarDrawer.tsx`**
- Backdrop: fixed inset-0, `bg-black/40`, `md:hidden`, only rendered when open
- Drawer aside: `fixed inset-y-0 left-0 w-[320px] max-w-[85vw]`, slides via `-translate-x-full` / `translate-x-0`
- Desktop: `md:static md:w-[360px] md:max-w-none md:translate-x-0 md:flex-shrink-0` — inline 360px, no backdrop, drawer state has zero visual effect
- Transition: `transition-transform duration-200 ease-out` (matches CLAUDE.md §Анимации)
- Pure Tailwind tokens — no hex literals

### Task 2: Wire ShellClient + hamburger — COMPLETE (commit c78f81f)

**`src/app/(main)/layout.tsx`**: Replaced the old `<div className="flex h-screen overflow-hidden bg-[#0f0f1a]">` wrapper with `<ShellClient sidebar={<Sidebar />}>{children}</ShellClient>`. The leftover dark-theme background is gone; Sidebar remains a server component rendered inside the server layout and passed as a ReactNode prop to the client shell.

**`src/components/chat/ChatWindow.tsx`**: Added
- `import { Menu } from 'lucide-react'`
- `import { useSidebarDrawer } from '@/components/layout/ShellClient'`
- `const { toggle: toggleSidebar } = useSidebarDrawer()` after existing effects
- Hamburger `<button>` at the top of the return div: `md:hidden`, `min-h-[44px] min-w-[44px]`, `aria-label="Открыть меню"`, `text-brand-text-muted hover:text-brand-primary hover:bg-brand-primary-soft`, `<Menu size={22} strokeWidth={1.75} />`

No other ChatWindow logic touched — realtime, typing, handlers preserved.

### Task 3: Manual responsive verification at 375/768/1024px — PENDING_USER_VERIFY

Human checkpoint. User must open DevTools Device Toolbar and confirm:
- 375×812: sidebar hidden, hamburger visible top-left, tap slides drawer in with dark backdrop, backdrop-tap and chat-row-tap both close drawer, hamburger target ≥44×44px
- 768×1024: sidebar inline 360px, no hamburger
- 1440×900: identical to pre-plan appearance
- Send text message at 375px to confirm scroll/input/send still work
- No console errors

## Commits

| Commit  | Description                                                     |
| ------- | --------------------------------------------------------------- |
| 91daa14 | feat(05-02): add ShellClient + SidebarDrawer responsive layout primitives |
| c78f81f | feat(05-02): wire ShellClient into main layout and add hamburger toggle |

## Deviations from Plan

### [Rule 3 - Blocking] `npm run build` fails under Node v25 (environmental)

- **Found during:** Task 2 verification
- **Issue:** `npm run build` throws `Error: Cannot find module './global'` from deep inside `next/dist/build/webpack/config/blocks/css/loaders/index.js`. This is a known Node v25 × Next 14 compatibility break (the prompt preamble flags `ERR_INVALID_PACKAGE_CONFIG` as a related env failure).
- **Scope:** Pre-existing environment problem, NOT caused by this plan's code. The build command in the verify block cannot succeed on this machine until Node is downgraded or Next is upgraded.
- **Action taken:** Relied on `npx tsc --noEmit` (passed clean with 0 errors) per executor-context instructions. `npm run lint` skipped for the same env reason.
- **Files modified:** none
- **Commit:** none

No other deviations — the code was already staged exactly to plan spec.

## Deferred Issues

- Upgrade Next.js to a Node 25-compatible version (or pin Node to LTS) so `npm run build` works again — tracked separately; not in scope for Phase 5.

## Known Stubs

None. All new code is wired: ShellClient is consumed by layout.tsx, useSidebarDrawer is consumed by ChatWindow, SidebarDrawer is consumed by ShellClient.

## Threat Flags

None. Pure client-side responsive layout refactor; no new network surface, no auth flows touched, existing `getUser()` → `redirect('/login')` gate in MainLayout preserved.

## Self-Check: PASSED

Files exist:
- FOUND: src/components/layout/ShellClient.tsx
- FOUND: src/components/layout/SidebarDrawer.tsx
- FOUND: (modified) src/app/(main)/layout.tsx
- FOUND: (modified) src/components/chat/ChatWindow.tsx

Commits exist:
- FOUND: 91daa14 (Task 1)
- FOUND: c78f81f (Task 2)

Acceptance criteria (grep-verified):
- `useSidebarDrawer` in ShellClient.tsx ✓
- `usePathname` in ShellClient.tsx ✓
- `md:hidden` + `md:static` + `md:w-[360px]` in SidebarDrawer.tsx ✓
- `transition-transform duration-200` in SidebarDrawer.tsx ✓
- `<ShellClient sidebar={<Sidebar />}>` in layout.tsx ✓
- No `bg-[#0f0f1a]` in layout.tsx ✓
- `Menu` + `useSidebarDrawer` imports + `md:hidden` + `min-h-[44px]` + `aria-label="Открыть меню"` in ChatWindow.tsx ✓
- `npx tsc --noEmit` → 0 errors ✓
- `npm run build` / `npm run lint` → skipped (Node v25 env break, documented above)
