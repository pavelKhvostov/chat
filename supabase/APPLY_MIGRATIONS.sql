-- Apply this in Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/cuuoyhikjawiyzgbrnku/sql/new

-- Adds message_attachments to realtime publication so attachments sync
-- to chat windows without a page reload.

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_attachments;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE direct_message_attachments;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;
