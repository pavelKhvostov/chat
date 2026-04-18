---
phase: 04-chat-realtime
fixed_at: 2026-04-18
fix_scope: critical_warning
findings_in_scope: 8
fixed: 7
skipped: 1
status: partial
iteration: 1
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-04-18
**Source review:** .planning/phases/04-chat-realtime/REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8
- Fixed: 7
- Skipped: 1

## Fixed Issues

### CR-01: Remove message_reads Realtime subscription (privacy leak)

**Files modified:** `src/hooks/useRealtime.ts`, `src/components/chat/ChatWindow.tsx`
**Commit:** 0fc6f73
**Applied fix:** Removed the unfiltered `postgres_changes` subscription for `message_reads` from `useRealtime` (Option B from review). Also removed the `onRead` prop from the `UseRealtimeOptions` interface and deleted the corresponding `onRead` callback from `ChatWindow.tsx`. The `markMessagesAsRead` call on new message arrival already keeps local state up to date.

---

### CR-02: GroupPage — verify group membership before fetching messages

**Files modified:** `src/app/(main)/[groupId]/page.tsx`
**Commit:** c92074d
**Applied fix:** Split the `Promise.all` into two sequential steps: first query the group alone and call `notFound()` if null, then run the remaining parallel queries (`memberCount`, `fetchMessages`, `members`). The `redirect('/login')` guard for unauthenticated users was already in place before this fix.

---

### WR-02: Optimistic dedup removes only first matching temp message

**Files modified:** `src/components/chat/ChatWindow.tsx`
**Commit:** 0018259
**Applied fix:** Replaced the `Array.filter` predicate that removed all matching temp messages with a `removed` flag pattern that stops after the first match, preventing duplicate rapid identical messages from both being removed when only one real message arrives.

---

### WR-03: deleteMessage silently succeeds when not the sender

**Files modified:** `src/lib/actions/messages.ts`
**Commit:** 6e0f583
**Applied fix:** Added `.select('id', { count: 'exact', head: true })` to the update query and check `if (!count || count === 0) throw new Error('Message not found or not owned by user')` after the error check.

---

### WR-04: message_reads INSERT policy lacks group membership check

**Files modified:** `supabase/migrations/00006_fix_rls_policies.sql`
**Commit:** 64d83c5
**Applied fix:** New migration drops the old `message_reads_insert` policy and recreates it with an `EXISTS (SELECT 1 FROM messages m WHERE m.id = message_reads.message_id AND is_group_member(m.group_id))` sub-check alongside the existing `auth.uid() = user_id` check.

---

### WR-05: message_reactions INSERT policy lacks group membership check

**Files modified:** `supabase/migrations/00006_fix_rls_policies.sql`
**Commit:** 64d83c5
**Applied fix:** Same migration drops and recreates `message_reactions_insert` with an identical `EXISTS` group membership check on the parent message's `group_id`.

---

### WR-06: pinned_messages INSERT/DELETE allows any group member

**Files modified:** `supabase/migrations/00006_fix_rls_policies.sql`
**Commit:** 64d83c5
**Applied fix:** Same migration drops and recreates both `pinned_messages_insert` and `pinned_messages_delete` policies, adding `AND is_admin()` to restrict pinning/unpinning to admins only.

---

## Skipped Issues

### WR-01: Stale closures in useRealtime — callbacks not in dep array

**File:** `src/hooks/useRealtime.ts:22-67`
**Reason:** Already fixed — the hook uses `const refs = useRef(options); refs.current = options` at the top of the function body, and all channel handlers call `refs.current.onInsert(...)`, `refs.current.onUpdate(...)`, etc. This is semantically equivalent to the per-callback `useRef` pattern suggested in the review. No stale closure risk exists in the current code.
**Original issue:** Callbacks captured at channel creation time could become stale if they close over changing state.

---

_Fixed: 2026-04-18_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
