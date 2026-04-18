-- 00008_attachments_realtime.sql
-- Добавляем message_attachments в realtime publication, чтобы вложения
-- приходили подписчикам без перезагрузки страницы.

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
