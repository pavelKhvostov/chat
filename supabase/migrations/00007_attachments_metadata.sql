-- 00007_attachments_metadata.sql
-- Add metadata jsonb column for storing waveform amplitudes + duration
-- for voice and video_circle attachments (Phase 5, D-08/D-09/D-12).

ALTER TABLE message_attachments
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;

ALTER TABLE direct_message_attachments
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;
