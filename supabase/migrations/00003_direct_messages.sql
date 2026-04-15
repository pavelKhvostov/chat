-- 00003_direct_messages.sql
-- Таблицы: direct_chats, direct_chat_members, direct_messages, direct_message_reads, direct_message_attachments

-- direct_chats: контейнер для DM между двумя пользователями
CREATE TABLE IF NOT EXISTS direct_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- direct_chat_members: участники DM (всегда 2)
CREATE TABLE IF NOT EXISTS direct_chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES direct_chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(chat_id, user_id)
);

-- direct_messages: сообщения в личной переписке
CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES direct_chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id),
  content text NOT NULL DEFAULT '',
  reply_to uuid REFERENCES direct_messages(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- direct_message_reads: статусы прочтения DM
CREATE TABLE IF NOT EXISTS direct_message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- direct_message_attachments: вложения в DM
CREATE TABLE IF NOT EXISTS direct_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
  path text NOT NULL,
  type text NOT NULL CHECK (type IN ('image', 'file', 'voice', 'video_circle')),
  file_name text NOT NULL,
  file_size integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
