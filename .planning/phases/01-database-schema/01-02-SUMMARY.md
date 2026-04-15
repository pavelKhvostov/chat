---
phase: 01-database-schema
plan: 02
subsystem: database
tags: [rls, security, postgresql, supabase]
dependency_graph:
  requires: ["01-01"]
  provides: ["01-03"]
  affects: ["all-tables"]
tech_stack:
  added: []
  patterns: ["SECURITY DEFINER helper functions", "RLS per-table policies"]
key_files:
  created:
    - supabase/migrations/00004_rls_policies.sql
  modified: []
decisions:
  - "SECURITY DEFINER functions bypass RLS for helper checks — avoids infinite recursion"
  - "folders_all uses single ALL policy instead of separate per-operation policies — owner is always auth.uid() = user_id"
  - "direct_chats_insert allows any authenticated user to create a chat — members are added separately"
metrics:
  duration: "5m"
  completed: "2026-04-15"
---

# Phase 01 Plan 02: RLS Policies Summary

**One-liner:** Row Level Security enabled on all 15 tables with SECURITY DEFINER helper functions for group/DM membership and admin role checks.

## What Was Done

- Created `supabase/migrations/00004_rls_policies.sql` with:
  - 3 helper functions (`is_group_member`, `is_direct_chat_member`, `is_admin`) marked SECURITY DEFINER
  - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for all 15 tables
  - SELECT/INSERT/UPDATE/DELETE policies tailored per table

## Policy Summary

| Table | Policies | Key rule |
|-------|----------|----------|
| profiles | SELECT, INSERT, UPDATE | Own row only for write; active users visible to all |
| groups | SELECT, INSERT, UPDATE, DELETE | Admin-only write; members can read |
| group_members | SELECT, INSERT, DELETE | Admin-only write; members can read |
| folders | ALL | Owner only (user_id = auth.uid()) |
| folder_items | ALL | Owner via parent folder |
| messages | SELECT, INSERT, UPDATE | Group member; sender for UPDATE |
| message_reads | SELECT, INSERT | Group member to read; own row to insert |
| message_reactions | SELECT, INSERT, DELETE | Group member to read; own row for write |
| message_attachments | SELECT, INSERT | Group member to read; sender to insert |
| pinned_messages | SELECT, INSERT, DELETE | Group member |
| direct_chats | SELECT, INSERT | DM member; any auth user to create |
| direct_chat_members | SELECT, INSERT | DM member |
| direct_messages | SELECT, INSERT, UPDATE | DM member; sender for UPDATE |
| direct_message_reads | SELECT, INSERT | DM member to read; own row to insert |
| direct_message_attachments | SELECT, INSERT | DM member to read; sender to insert |

## Verification

- [x] `grep -c "ENABLE ROW LEVEL SECURITY"` returns 15
- [x] File contains `is_group_member`, `is_direct_chat_member`, `is_admin` functions
- [x] All 3 functions marked `SECURITY DEFINER`
- [x] Every table has at least one SELECT policy

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `/Users/pavelhvostov/Desktop/claude/vcusnochat/supabase/migrations/00004_rls_policies.sql` — FOUND
- Commit `f21b4dc` — FOUND
