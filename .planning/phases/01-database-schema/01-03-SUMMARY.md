# Plan 01-03 Summary: Storage, Realtime, индексы
**Status:** Partial — awaiting manual step
**Completed:** 2026-04-15

## What was done
- Created supabase/migrations/00005_storage_realtime_indexes.sql
  - Storage bucket "attachments" (private, public=false)
  - Storage RLS policies for bucket
  - Realtime: messages, direct_messages, message_reactions, message_reads
  - 22 indexes on FK and frequently filtered columns

## Pending
- [ ] User must run: `supabase db push` to apply all 5 migrations to Supabase Cloud
- [ ] Verify 15 tables exist with rowsecurity=true
- [ ] Verify Storage bucket exists
- [ ] Verify Realtime publication contains messages/direct_messages

## Files created
- supabase/migrations/00005_storage_realtime_indexes.sql
