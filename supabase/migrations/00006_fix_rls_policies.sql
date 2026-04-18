-- 00006_fix_rls_policies.sql
-- Fix RLS policy gaps found in code review:
--   WR-04: message_reads INSERT — add group membership check
--   WR-05: message_reactions INSERT — add group membership check
--   WR-06: pinned_messages INSERT/DELETE — restrict to admins only

-- ============================================================
-- WR-04: message_reads INSERT policy
-- ============================================================

DROP POLICY IF EXISTS "message_reads_insert" ON message_reads;

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

-- ============================================================
-- WR-05: message_reactions INSERT policy
-- ============================================================

DROP POLICY IF EXISTS "message_reactions_insert" ON message_reactions;

CREATE POLICY "message_reactions_insert" ON message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_reactions.message_id
        AND is_group_member(m.group_id)
    )
  );

-- ============================================================
-- WR-06: pinned_messages INSERT/DELETE — admin only
-- ============================================================

DROP POLICY IF EXISTS "pinned_messages_insert" ON pinned_messages;
DROP POLICY IF EXISTS "pinned_messages_delete" ON pinned_messages;

CREATE POLICY "pinned_messages_insert" ON pinned_messages
  FOR INSERT TO authenticated
  WITH CHECK (is_group_member(group_id) AND is_admin());

CREATE POLICY "pinned_messages_delete" ON pinned_messages
  FOR DELETE TO authenticated
  USING (is_group_member(group_id) AND is_admin());
