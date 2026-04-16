# Coding Conventions

**Analysis Date:** 2026-04-15

## Naming Patterns

**Files:**
- React components: PascalCase — `MessageBubble.tsx`, `ChatWindow.tsx`, `FolderList.tsx`
- Hooks: camelCase with `use` prefix — `useRealtime.ts`, `useTyping.ts`
- Server actions modules: camelCase noun — `messages.ts`, `groups.ts`, `folders.ts`
- Types file: `database.types.ts` (generated, never hand-edited)

**Functions:**
- Server actions: camelCase verb+noun — `sendMessage`, `fetchMessages`, `deleteMessage`, `toggleReaction`, `createFolder`, `moveGroupToFolder`
- React components: PascalCase named export — `export function MessageBubble(...)`
- Hooks: camelCase `use` prefix named export — `export function useRealtime(...)`
- Event handlers inside components: `handle` prefix — `handleSend`, `handleChange`, `handleKeyDown`

**Variables:**
- camelCase throughout — `groupedReactions`, `typingUsers`, `memberProfiles`
- Boolean state: `is` prefix — `isSending`, `isLoadingMore`, `isDeleted`, `isOwn`
- Ref variables: descriptive suffix `Ref` — `typingTimeoutRef`, `inputRef`, `channelRef`

**Types/Interfaces:**
- Interfaces: PascalCase with descriptive name — `MessageBubbleProps`, `ChatWindowProps`, `UseRealtimeOptions`
- Local type aliases: PascalCase — `ReactionGroup`, `ReplyTarget`, `Profile`
- Exported composite types: `TypeWithSuffix` pattern — `MessageWithRelations`, `GroupWithChildren`, `FolderWithItems`

**Database tables:** snake_case plural — `message_reactions`, `group_members`, `folder_items`

## TypeScript Patterns

**Strict mode is enabled** (`"strict": true` in `tsconfig.json`). No `any` is allowed.

**Type imports use the `type` keyword:**
```typescript
import { type Tables } from '@/lib/types/database.types'
import { type Database } from '@/lib/types/database.types'
```

**Database types are derived from generated types, never hand-written:**
```typescript
// Correct — use generated types
type Group = Database['public']['Tables']['groups']['Row']
type RealtimeMessage = Tables<'messages'>

// Correct — Pick for partial shapes
sender: Pick<Tables<'profiles'>, 'id' | 'display_name' | 'avatar_url'>
```

**Composite return types are exported from the action file:**
```typescript
// src/lib/actions/messages.ts
export type MessageWithRelations = Tables<'messages'> & {
  sender: Pick<Tables<'profiles'>, 'id' | 'display_name' | 'avatar_url'>
  reactions: Pick<Tables<'message_reactions'>, 'id' | 'emoji' | 'user_id'>[]
}
```

**Type guards via filter callbacks:**
```typescript
.filter((id): id is string => id !== null && !memberGroupIds.includes(id))
```

**Return types are always explicit on exported functions:**
```typescript
export async function fetchMessages(groupId: string, cursor?: string): Promise<MessageWithRelations[]>
export async function sendMessage(groupId: string, content: string, replyTo?: string): Promise<void>
```

**Never use `as any` — cast via known types only:**
```typescript
return ((data ?? []) as MessageWithRelations[]).reverse()
(payload.new as RealtimeMessage)
```

## Server Actions

**All server action files start with `'use server'`.**

**Location:** `src/lib/actions/` — one file per domain module.

**Auth guard pattern** (used in every mutating action):
```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) throw new Error('Unauthorized')
```

**Read actions return empty/null on unauthenticated** (no throw):
```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) return []
```

**Error handling in actions:**
- Mutations that must succeed: `if (error) throw error`
- Non-critical side-effects (e.g., read receipts): `console.error(...)` without throw
- Actions returning to UI: return `{ error?: string }` object, not throw

```typescript
// Throws for hard failures
export async function sendMessage(...): Promise<void> {
  ...
  if (error) throw error
}

// Returns error object for UI-facing actions
export async function createFolder(name: string): Promise<{ error?: string }> {
  ...
  if (error) return { error: error.message }
  return {}
}

// Swallows non-critical errors
export async function markMessagesAsRead(messageIds: string[]): Promise<void> {
  ...
  if (error) {
    console.error('markMessagesAsRead error:', error)
  }
}
```

**`revalidatePath` is called after mutations that affect navigation/sidebar:**
```typescript
revalidatePath('/', 'layout')
```

**Supabase client is always created per-call:** `const supabase = await createClient()`

## Component Patterns

**Server vs Client boundary:**
- Server components: no directive, async, call Server Actions directly — `Sidebar.tsx`, page files
- Client components: `'use client'` at top, use hooks and state — `ChatWindow.tsx`, `MessageBubble.tsx`, `MessageInput.tsx`

**Props interfaces are always defined inline in the same file:**
```typescript
interface MessageBubbleProps {
  message: MessageWithRelations
  currentUserId: string
  onReply: (message: MessageWithRelations) => void
}
```

**Named exports only — no default exports for components:**
```typescript
export function MessageBubble({ message, currentUserId, onReply }: MessageBubbleProps) {
```

**Callback props are prefixed `on`:** `onSend`, `onReply`, `onCancelReply`, `onTyping`, `onLoadMore`

**Optimistic updates pattern** (used in `ChatWindow.tsx`):
```typescript
// 1. Add temp message with `temp-` prefixed id
const tempId = `temp-${Date.now()}`
setMessages((prev) => [...prev, optimisticMsg])
// 2. Call server action
// 3. On error, remove temp message
setMessages((prev) => prev.filter((m) => m.id !== tempId))
// 4. Realtime event replaces temp message on success
```

**Data fetching in Server Components** — parallel with `Promise.all`:
```typescript
const [groups, folders, profile] = await Promise.all([
  getGroupsForUser(),
  getFoldersForUser(),
  getProfile(),
])
```

**`useCallback` is used for all handlers passed to `useRealtime`** to avoid channel re-creation.

**`useRef` is used for mutable values that should not trigger re-render:** callback refs in `useRealtime`, `typingTimeoutRef` in `MessageInput`, `profileCache` in `ChatWindow`.

## Import Organization

**Order:**
1. React/Next.js built-ins — `import { useState, useRef } from 'react'`
2. External packages — `import { Check, CheckCheck } from 'lucide-react'`
3. Internal path aliases (`@/`) — actions, hooks, components, types

**Path alias:** `@/` maps to `src/` — always use `@/` for internal imports, never relative `../`.

```typescript
import { type MessageWithRelations, deleteMessage } from '@/lib/actions/messages'
import { toggleReaction } from '@/lib/actions/reactions'
```

## Tailwind CSS Patterns

**Color system — dark theme only:**
- Main background: `bg-[#0f0f1a]`
- Sidebar / panels: `bg-[#17212b]`
- Message bubble (incoming): `bg-[#1e2c3a]`
- Message bubble (own): `bg-indigo-600`
- Borders: `border-white/[0.06]`
- Primary text: `text-white/90`, `text-white/95`
- Secondary text: `text-white/40`, `text-white/35`
- Muted: `text-white/25`, `text-white/20`
- Accent: `text-indigo-300`, `bg-indigo-600`, `border-indigo-500`
- Timestamps: `font-mono text-[10px]`

**Interaction states:**
```
hover:bg-white/5   hover:bg-white/10   hover:text-white/60
transition-colors duration-150
```

**Conditional classes — inline ternary only (no clsx/cn):**
```typescript
className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} group mb-1`}
```

**Arbitrary values are used for fine-grained opacity and sizing:**
`bg-white/[0.06]`, `bg-white/[0.05]`, `text-[10px]`, `w-[360px]`, `max-w-[70%]`

**Group hover pattern** for action buttons that appear on row hover:
```
className="... opacity-0 group-hover:opacity-100 transition-opacity"
```
Parent must have `group` class.

**No external class utility libraries** (no `clsx`, `cn`, `classnames`).

**Lucide icons** — always `strokeWidth={1.5}`, size via `size={N}`:
```typescript
<Reply size={14} strokeWidth={1.5} />
```

## Comments

- Russian-language inline comments for complex logic and intent
- No JSDoc on component props — interface definition is the documentation
- `// eslint-disable-line` used sparingly for intentional empty deps arrays
- Comment before sections of JSX using `{/* Section name */}` style

---

*Convention analysis: 2026-04-15*
