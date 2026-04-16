# Codebase Concerns

**Analysis Date:** 2026-04-15

---

## Security Issues

### [CRITICAL] CR-01: Realtime `message_reads` subscription leaks read receipts across all groups

- Risk: Every authenticated user receives INSERT events from `message_reads` for all groups in the database. No `filter` clause is set on the `postgres_changes` listener. Supabase Realtime bypasses RLS for filtering — the filter must be applied explicitly on the subscription.
- Files: `src/hooks/useRealtime.ts` (the `onRead` listener, currently commented out / not implemented in listed code but present in REVIEW findings)
- Current mitigation: None. The `message_reads` table is added to `supabase_realtime` publication in `supabase/migrations/00005_storage_realtime_indexes.sql:39`.
- Fix: Either add `group_id` column to `message_reads` and filter `group_id=eq.${groupId}`, or remove the `message_reads` Realtime subscription entirely and handle read state client-side via the sender's own `markMessagesAsRead` call.

---

### [CRITICAL] CR-02: `GroupPage` calls `fetchMessages` before confirming group membership; unauthenticated path returns null silently

- Risk: `src/app/(main)/[groupId]/page.tsx` uses `Promise.all` to fetch group data and messages concurrently. If the user is not authenticated, the auth check returns `null` with no redirect. A full `fetchMessages` DB round-trip executes before the null is handled.
- Files: `src/app/(main)/[groupId]/page.tsx`
- Current mitigation: RLS on `messages` and `groups` blocks actual data return for non-members, so no data leaks. However, the silent null return gives no error feedback and wastes a DB call.
- Fix: Replace `if (!user) return null` with `if (!user) redirect('/login')`. Restructure to call `fetchMessages` only after the group membership check resolves (sequential, not parallel).

---

### [WARNING] WR-04: `message_reads` INSERT RLS policy missing group membership check

- Risk: Any authenticated user can insert a read receipt for any `message_id` by guessing or enumerating message UUIDs, including messages in groups they are not a member of. Enables message-ID enumeration and table pollution.
- Files: `supabase/migrations/00004_rls_policies.sql:178-181`
- Current mitigation: SELECT RLS blocks retrieval of these spurious rows by non-members.
- Fix: Replace the INSERT policy with:
  ```sql
  CREATE POLICY "message_reads_insert" ON message_reads
    FOR INSERT TO authenticated
    WITH CHECK (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM messages m
        WHERE m.id = message_reads.message_id
          AND is_group_member(m.group_id)
      )
    );
  ```
  Requires a new migration file.

---

### [WARNING] WR-05: `message_reactions` INSERT RLS policy missing group membership check

- Risk: Same pattern as WR-04. Any authenticated user can add reactions to messages in private groups by guessing a message UUID.
- Files: `supabase/migrations/00004_rls_policies.sql:196-198`
- Current mitigation: SELECT RLS blocks the reaction from being visible to the attacker, but the row is written to the table.
- Fix: Add an EXISTS check on `messages m ... AND is_group_member(m.group_id)` to the `WITH CHECK` clause, identical pattern to WR-04 fix.

---

### [WARNING] WR-06: Any group member can pin/unpin messages — no admin/moderator gate

- Risk: `pinned_messages_insert` and `pinned_messages_delete` policies check only `is_group_member(group_id)`. In a corporate tool, pinning is typically a moderation action.
- Files: `supabase/migrations/00004_rls_policies.sql:238-243`
- Current mitigation: None.
- Fix: Change to `WITH CHECK (is_group_member(group_id) AND is_admin())` if pinning should be admin-only. Confirm intended authorization model first.

---

### [INFO] Storage SELECT policy is overly permissive

- Risk: `storage_attachments_select` in `supabase/migrations/00005_storage_realtime_indexes.sql:13-15` allows any authenticated user to read any attachment by URL — it only checks `auth.uid() IS NOT NULL`. There is no check that the user belongs to the group or chat the attachment is associated with.
- Files: `supabase/migrations/00005_storage_realtime_indexes.sql:13-15`
- Current mitigation: Bucket is private (`public = false`), so direct URL access without auth is blocked. But any authenticated user can access any attachment URL.
- Fix: Join against `message_attachments` or `direct_message_attachments` and verify group/chat membership before granting SELECT. This is complex — a simpler interim fix is to generate short-lived signed URLs server-side rather than relying on RLS.

---

## Known Bugs

### [WARNING] WR-03: `deleteMessage` silently swallows no-op when user is not the sender

- Symptoms: Calling `deleteMessage` with a `messageId` the authenticated user does not own updates zero rows, throws no error, and returns void. The UI receives a success signal for a failed operation.
- Files: `src/lib/actions/messages.ts:69-82`
- Trigger: Any call to `deleteMessage` where `sender_id != auth.uid()` (e.g., admin trying to delete, or race condition).
- Fix:
  ```typescript
  const { error, count } = await supabase.from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('sender_id', user.id)
    .select('id', { count: 'exact', head: true })
  if (error) throw error
  if (!count || count === 0) throw new Error('Message not found or not owned by user')
  ```

---

### [WARNING] WR-02: Optimistic deduplication removes all temp messages with matching content

- Symptoms: When a user sends two identical messages in rapid succession, the deduplication filter removes both temp messages on the first Realtime INSERT, leaving one message in the UI where two should appear.
- Files: `src/components/chat/ChatWindow.tsx:81-85`
- Trigger: Send the same message text twice quickly before the first Realtime event arrives.
- Fix: Match only the first temp message with that content:
  ```typescript
  let removed = false
  const withoutTemp = prev.filter((m) => {
    if (!removed && m.id.startsWith('temp-') && m.content === msg.content) {
      removed = true
      return false
    }
    return true
  })
  ```

---

## Technical Debt

### [WARNING] WR-01: Stale closure risk in `useRealtime` — callbacks not updated via refs

- Issue: The `useEffect` in `useRealtime` captures the initial callback references. While the current implementation uses `useRef` to hold callbacks (based on the REVIEW noting this as the fix approach and the current hook code showing `onInsertRef`, `onUpdateRef`, etc.), the REVIEW flagged the pattern as fragile if callbacks ever close over changing state.
- Files: `src/hooks/useRealtime.ts:18-55`
- Impact: Currently safe; breaks silently if any callback closes over non-stable state in the future.
- Fix: Ensure all four callback refs (`onInsertRef`, `onUpdateRef`, `onDeleteRef`, `onReadRef`) are updated on every render before the channel handler executes — the current code already does this at lines 24-27.

---

### [INFO] IN-02: `createClient()` called inside `useRealtime` on every render

- Issue: `const supabase = createClient()` at `src/hooks/useRealtime.ts:30` runs on every render. If `createClient` is not a singleton, a new client is instantiated each render. The `useEffect` cleanup closure captures the `supabase` reference from the render that created the effect, so cleanup should be correct — but only if `createClient` returns a stable singleton.
- Files: `src/hooks/useRealtime.ts:30`, `src/lib/supabase/client.ts`
- Fix: Verify `createClient` returns a singleton. If not, memoize: `const supabase = useMemo(() => createClient(), [])`.

---

### [INFO] IN-03: `getGroupsForUser` performs 3 sequential DB round-trips

- Issue: `src/lib/actions/groups.ts:14-66` makes up to 3 separate queries: (1) fetch `group_members`, (2) fetch member groups, (3) fetch parent groups. This is called on every sidebar render.
- Files: `src/lib/actions/groups.ts:14-66`
- Impact: 3× latency on sidebar load. At 100 users, acceptable, but worth consolidating.
- Fix: Replace with a single query using a recursive CTE or Supabase's `.select()` with joined relations.

---

### [INFO] IN-01: `useRealtime` does not reconnect after CHANNEL_ERROR

- Issue: On `CHANNEL_ERROR`, the subscription is permanently lost until the parent component re-mounts or `groupId` changes. No reconnect logic exists and no user feedback is shown.
- Files: `src/hooks/useRealtime.ts`
- Note: REVIEW.md marks this as fixed in latest code — verify the `subscribe()` callback handling `CHANNEL_ERROR` is present.
- Fix if not present: Increment a `retryCount` state variable inside the error handler to re-trigger the `useEffect`.

---

## Missing Critical Features

### File Upload — No `/api/upload` route implemented

- Problem: CLAUDE.md mandates file uploads via `/api/upload`. No such route exists in `src/app/api/`. `message_attachments` and `direct_message_attachments` tables exist and are fully covered by RLS, but the upload pathway is unimplemented.
- Blocks: Attachment sending in chat and DMs.

### Admin Panel — Not implemented

- Problem: `src/app/admin/` directory structure is defined in CLAUDE.md (`users/`, `groups/`) but no implementation files are present.
- Blocks: User management, group management. The middleware does protect `/admin` routes via role check.

### Direct Messages — No UI

- Problem: DB schema for DMs (`direct_chats`, `direct_chat_members`, `direct_messages`, `direct_message_reads`, `direct_message_attachments`) is fully migrated and RLS-covered. No `src/app/(main)/dm/[chatId]/` page exists.
- Blocks: DM feature end-to-end.

### Search — Not implemented

- Problem: No search action in `src/lib/actions/` and no search UI. No full-text index exists in migrations.
- Blocks: Message and user search.

---

## Test Coverage Gaps

### No tests exist

- What's not tested: All Server Actions (`messages.ts`, `reactions.ts`, `groups.ts`, `auth.ts`, `folders.ts`), all hooks (`useRealtime`, `useTyping`), all components, all RLS policies.
- Files: Entire `src/` tree.
- Risk: RLS policy bugs, Server Action logic errors, and Realtime race conditions have no automated detection.
- Priority: High — especially for the security-critical RLS fixes (WR-04, WR-05, CR-01).

---

*Concerns audit: 2026-04-15*
*Source: Phase 04 REVIEW.md + direct code analysis*
