---
phase: 04-chat-realtime
plan: "01"
subsystem: messages
tags: [server-actions, realtime, presence, supabase, typescript]
dependency_graph:
  requires: [01-database, 02-auth]
  provides: [messages-actions, realtime-hooks]
  affects: [04-02-chat-ui]
tech_stack:
  added: []
  patterns:
    - Server Actions with 'use server' + createClient() from server.ts
    - useRealtime: single Supabase channel per groupId, three postgres_changes events
    - useTyping: Presence channel with untrack() before removeChannel in cleanup
key_files:
  created:
    - src/lib/actions/messages.ts
    - src/lib/actions/reactions.ts
    - src/hooks/useRealtime.ts
    - src/hooks/useTyping.ts
  modified: []
decisions:
  - ignoreDuplicates:true in markMessagesAsRead to prevent constraint errors without breaking UX
  - deleteMessage uses soft delete (deleted_at) + double sender_id filter (action + RLS)
  - useRealtime takes stable callbacks in deps to avoid stale closures — consumers must memoize
metrics:
  duration: ~10min
  completed: 2026-04-15
  tasks: 2
  files: 4
---

# Phase 04 Plan 01: Messages Server Actions and Realtime Hooks Summary

Server Actions для всех операций с сообщениями и клиентские хуки Realtime/Presence.

## What Was Implemented

### Task 1 — Server Actions

**src/lib/actions/messages.ts**

Exports: `MessageWithRelations` type, `fetchMessages`, `sendMessage`, `deleteMessage`, `markMessagesAsRead`.

- `fetchMessages(groupId, cursor?)` — запрос с полным JOIN (sender, reply, reactions, reads), descending order, limit 50, cursor-based pagination, результат реверсируется перед возвратом
- `sendMessage(groupId, content, replyTo?)` — auth.getUser() обязателен, sender_id берётся с сервера (T-04-02)
- `deleteMessage(messageId)` — soft delete через `deleted_at`, дополнительный фильтр `.eq('sender_id', user.id)` поверх RLS (T-04-01)
- `markMessagesAsRead(messageIds[])` — batch upsert с `ignoreDuplicates: true`, ошибки логируются но не бросаются

**src/lib/actions/reactions.ts**

Exports: `toggleReaction`.

- `toggleReaction(messageId, emoji)` — maybeSingle() для проверки существования, DELETE если есть, INSERT если нет. user_id всегда с сервера (T-04-03)

### Task 2 — Client Hooks

**src/hooks/useRealtime.ts**

- Один канал `group:{groupId}` с тремя `.on('postgres_changes', ...)` подписками (INSERT/UPDATE/DELETE)
- `groupId` в deps массиве useEffect — канал пересоздаётся при смене группы
- Cleanup: `supabase.removeChannel(channel)` без утечек

**src/hooks/useTyping.ts**

- Presence канал `typing:{groupId}` с key = currentUserId
- Sync-событие фильтрует currentUserId из результата
- Cleanup: `channelRef.current?.untrack()` ПЕРЕД `supabase.removeChannel(channel)`
- `setTyping(typing: boolean)` через `useCallback` — стабильная ссылка

## Key Decisions

1. `MessageWithRelations` экспортируется из messages.ts — единственный источник типа для UI-компонентов
2. `markMessagesAsRead` не бросает исключение — частичный сбой не должен ломать UX чата
3. `useRealtime` принимает callbacks в пропсах, не в deps — потребители обязаны передавать мемоизированные функции
4. `untrack()` перед `removeChannel` в useTyping — предотвращает зависание typing-индикатора у других пользователей

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] src/lib/actions/messages.ts exists
- [x] src/lib/actions/reactions.ts exists
- [x] src/hooks/useRealtime.ts exists
- [x] src/hooks/useTyping.ts exists
- [x] `npx tsc --noEmit` — no errors
- [x] `npm run lint` — no errors
- [x] commit 0ed41c1 exists

## Self-Check: PASSED
