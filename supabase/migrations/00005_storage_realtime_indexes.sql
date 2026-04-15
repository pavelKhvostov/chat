-- 00005_storage_realtime_indexes.sql
-- Storage bucket, Realtime, индексы

-- ============================================================
-- Storage bucket "attachments" (приватный)
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS для bucket attachments
CREATE POLICY "storage_attachments_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "storage_attachments_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "storage_attachments_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- Realtime
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reads;

-- ============================================================
-- Индексы (все IF NOT EXISTS)
-- ============================================================

-- profiles
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_is_active_idx ON profiles(is_active);

-- groups
CREATE INDEX IF NOT EXISTS groups_parent_id_idx ON groups(parent_id);
CREATE INDEX IF NOT EXISTS groups_created_by_idx ON groups(created_by);

-- group_members
CREATE INDEX IF NOT EXISTS group_members_group_id_idx ON group_members(group_id);
CREATE INDEX IF NOT EXISTS group_members_user_id_idx ON group_members(user_id);

-- folders
CREATE INDEX IF NOT EXISTS folders_user_id_idx ON folders(user_id);

-- folder_items
CREATE INDEX IF NOT EXISTS folder_items_folder_id_idx ON folder_items(folder_id);
CREATE INDEX IF NOT EXISTS folder_items_group_id_idx ON folder_items(group_id);

-- messages
CREATE INDEX IF NOT EXISTS messages_group_id_created_at_idx ON messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_reply_to_idx ON messages(reply_to);

-- message_reads
CREATE INDEX IF NOT EXISTS message_reads_message_id_idx ON message_reads(message_id);
CREATE INDEX IF NOT EXISTS message_reads_user_id_idx ON message_reads(user_id);

-- message_reactions
CREATE INDEX IF NOT EXISTS message_reactions_message_id_idx ON message_reactions(message_id);

-- message_attachments
CREATE INDEX IF NOT EXISTS message_attachments_message_id_idx ON message_attachments(message_id);

-- pinned_messages
CREATE INDEX IF NOT EXISTS pinned_messages_group_id_idx ON pinned_messages(group_id);

-- direct_chat_members
CREATE INDEX IF NOT EXISTS direct_chat_members_chat_id_idx ON direct_chat_members(chat_id);
CREATE INDEX IF NOT EXISTS direct_chat_members_user_id_idx ON direct_chat_members(user_id);

-- direct_messages
CREATE INDEX IF NOT EXISTS direct_messages_chat_id_created_at_idx ON direct_messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS direct_messages_sender_id_idx ON direct_messages(sender_id);

-- direct_message_reads
CREATE INDEX IF NOT EXISTS direct_message_reads_message_id_idx ON direct_message_reads(message_id);

-- direct_message_attachments
CREATE INDEX IF NOT EXISTS direct_message_attachments_message_id_idx ON direct_message_attachments(message_id);
