# Testing Patterns

**Analysis Date:** 2026-04-15

## Current State

**No tests exist in this codebase.**

There are no test files (`.test.ts`, `.test.tsx`, `.spec.ts`, `.spec.tsx`), no test runner config, and no test-related packages in `package.json`. The only script is `npm run lint` (Next.js ESLint).

## Test Framework (Not Yet Configured)

**Recommended stack for this project:**

**Runner:** Vitest (compatible with Next.js App Router, fast, native ESM)
- Config file: `vitest.config.ts`

**Component testing:** React Testing Library (`@testing-library/react`)

**Mocking:** Vitest built-in `vi.mock()`

**Install:**
```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

**Run Commands (once configured):**
```bash
npx vitest              # Run all tests
npx vitest --watch      # Watch mode
npx vitest --coverage   # Coverage report
```

## Recommended Test File Organization

**Location:** Co-located with source files is preferred, or in a `__tests__` sibling directory.

**Naming:**
- Unit tests: `messages.test.ts`, `ChatWindow.test.tsx`
- Hook tests: `useRealtime.test.ts`

**Structure:**
```
src/
  lib/
    actions/
      messages.test.ts
      groups.test.ts
      folders.test.ts
      reactions.test.ts
    types/
  components/
    chat/
      ChatWindow.test.tsx
      MessageBubble.test.tsx
      MessageInput.test.tsx
    sidebar/
      Sidebar.test.tsx
  hooks/
    useRealtime.test.ts
    useTyping.test.ts
```

## What to Mock

**Supabase client** — all action tests must mock `@/lib/supabase/server` and `@/lib/supabase/client`:

```typescript
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}))
```

**`next/cache` and `next/navigation`** — for actions that call `revalidatePath` or `redirect`:
```typescript
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn(), notFound: vi.fn() }))
```

**What NOT to mock:**
- Internal utility logic (type transformations, tree-building in `getGroupsForUser`)
- React state logic in components (test via user interaction instead)

## Key Areas Needing Tests

### HIGH PRIORITY

**`src/lib/actions/messages.ts` — `sendMessage`, `fetchMessages`, `deleteMessage`**
- `sendMessage` throws when unauthenticated
- `sendMessage` inserts correct row shape including `reply_to`
- `deleteMessage` only soft-deletes (sets `deleted_at`), not hard delete
- `deleteMessage` scoped to `sender_id = user.id` — cannot delete others' messages
- `fetchMessages` reverses order (returns ascending after descending query)
- `fetchMessages` applies cursor correctly for pagination
- `markMessagesAsRead` is a no-op when `messageIds` is empty

**`src/lib/actions/reactions.ts` — `toggleReaction`**
- Deletes reaction when it already exists (idempotent toggle)
- Inserts reaction when it does not exist
- Throws when unauthenticated

**`src/lib/actions/groups.ts` — `getGroupsForUser`**
- Builds tree correctly: top-level groups contain `children` array
- Loads parent groups even if user is not a direct member of them
- Returns `[]` when unauthenticated

### MEDIUM PRIORITY

**`src/lib/actions/folders.ts`**
- `moveGroupToFolder` removes group from all folders before adding to new one
- `deleteFolder` scoped to `user_id` — cannot delete others' folders
- `createFolder` returns `{ error }` on Supabase failure (not throw)

**`src/components/chat/MessageInput.tsx`**
- Enter key sends message; Shift+Enter inserts newline
- Textarea height resets after send
- `onTyping(false)` called after 2000ms debounce
- Send button disabled when text is empty or `isSending`

**`src/components/chat/MessageBubble.tsx`**
- Own messages render on right (`items-end`), others on left
- Deleted messages show "Сообщение удалено" and hide actions
- Reaction grouping logic: counts per emoji, marks `reacted` correctly
- Reply quote renders when `message.reply` is not null

### LOWER PRIORITY

**`src/hooks/useRealtime.ts`**
- Subscribes to correct channel `group:{groupId}` on mount
- Cleans up channel on unmount
- Callback refs pattern: calling `onInsert` after ref update triggers new handler

**`src/hooks/useTyping.ts`**
- Filters out `currentUserId` from typing list
- Tracks correct shape `{ typing, displayName }` via Supabase presence

**`src/components/sidebar/Sidebar.tsx`**
- Renders empty state when no groups and no folders
- Groups in folders are not rendered in the free groups list (deduplication)

## Test Structure Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendMessage } from '@/lib/actions/messages'

vi.mock('@/lib/supabase/server', () => ({ ... }))

describe('sendMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when user is not authenticated', async () => {
    // mock getUser to return null user
    await expect(sendMessage('group-1', 'hello')).rejects.toThrow('Unauthorized')
  })

  it('inserts message with correct shape', async () => {
    // mock getUser to return valid user
    // mock insert to succeed
    // assert insert was called with { group_id, content, sender_id, reply_to }
  })
})
```

## Coverage

**Requirements:** None enforced.

**Recommended targets once testing is added:**
- Server actions (`src/lib/actions/`): 80%+ — highest risk, pure logic
- Hooks (`src/hooks/`): 60%+ — complex async/realtime behavior
- Components: focus on behavior, not render snapshots

---

*Testing analysis: 2026-04-15*
