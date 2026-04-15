# Plan 01-01 Summary: Основные таблицы (DDL)
**Status:** Complete
**Completed:** 2026-04-15

## What was done
- Created supabase/migrations/00001_core_users_groups.sql (profiles, groups, group_members, folders, folder_items)
- Created supabase/migrations/00002_messages.sql (messages, message_reads, message_reactions, message_attachments, pinned_messages)
- Created supabase/migrations/00003_direct_messages.sql (direct_chats, direct_chat_members, direct_messages, direct_message_reads, direct_message_attachments)

## Verification
- [x] All 15 tables defined across 3 migration files
- [x] UUID PKs with gen_random_uuid()
- [x] timestamptz for all dates
- [x] Soft delete via deleted_at on messages and direct_messages
- [x] All FK have explicit ON DELETE behavior
- [x] All migrations use IF NOT EXISTS (idempotent)

## Files created
- supabase/migrations/00001_core_users_groups.sql
- supabase/migrations/00002_messages.sql
- supabase/migrations/00003_direct_messages.sql

## Self-Check: PASSED
