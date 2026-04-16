---
phase: 04-chat-realtime
plan: "02"
subsystem: chat-ui
tags: [react, realtime, tailwind, typescript, telegram-style]
dependency_graph:
  requires: [04-01]
  provides: [chat-ui-components]
  affects: [05-attachments]
tech_stack:
  added: []
  patterns:
    - MessageBubble with hover-controlled action buttons (Reply, Delete, quick reactions)
    - IntersectionObserver on top sentinel for infinite scroll pagination
    - Debounced typing events (2000ms) passed up via onTyping prop
    - ChatWindow manages all state: messages, replyTo, useRealtime, useTyping
key_files:
  created:
    - src/components/chat/MessageBubble.tsx
    - src/components/chat/MessageList.tsx
    - src/components/chat/MessageInput.tsx
    - src/components/chat/ChatWindow.tsx
  modified:
    - src/app/(main)/[groupId]/page.tsx
decisions:
  - groupId prop kept in MessageInput interface for future use (file uploads need it), suppressed unused-vars via eslint-disable-line
  - onInsert enriches realtime payload with placeholder sender (display_name 'Загрузка...') — acceptable for v1, correct data arrives on next SSR load
  - useCallback on all useRealtime callbacks to satisfy stable-reference requirement from 04-01
  - replyTo state lifted to ChatWindow (not MessageInput) to allow MessageList to trigger it via onReply
metrics:
  duration: ~15min
  completed: 2026-04-15
  tasks: 2
  files: 5
---

# Phase 04 Plan 02: Telegram-style Chat UI Components Summary

Полный UI чата с реалтаймом: пузыри сообщений, бесконечная прокрутка, ввод с reply и typing indicator.

## What Was Implemented

### Task 1 — MessageBubble

**src/components/chat/MessageBubble.tsx**

- Своё сообщение: `bg-indigo-600`, выравнивание по правому краю, `rounded-br-sm`
- Чужое: `bg-[#1e2c3a]`, левое выравнивание, имя отправителя (indigo-300) над пузырём
- Reply quote: левая граница `border-indigo-300`, имя + усечённый текст
- Soft delete: показывает «Сообщение удалено» курсивом вместо контента
- Статус прочтения: `Check` / `CheckCheck` для своих сообщений
- Hover: появляются кнопки Reply и Trash2 (для своих), quick reaction picker (6 эмодзи)
- Reactions: pill-кнопки под пузырём, highlighted если текущий пользователь реагировал
- Группировка реакций через `reduce` по emoji

### Task 2 — MessageList, MessageInput, ChatWindow, page.tsx

**src/components/chat/MessageList.tsx**

- `IntersectionObserver` на `topRef` — при появлении в viewport вызывает `onLoadMore`
- Отслеживание позиции скролла через `handleScroll` — `isAtBottom < 100px`
- Автоскролл через `requestAnimationFrame` + `scrollIntoView({ behavior: 'smooth' })`
- Loading indicator «Загрузка...» при `isLoadingMore`

**src/components/chat/MessageInput.tsx**

- Auto-resize textarea: `onInput` пересчитывает высоту, `max-h-[120px]`
- Enter = отправка, Shift+Enter = новая строка
- Debounce 2000ms для `onTyping(false)` через `typingTimeoutRef`
- Reply preview над полем ввода с кнопкой закрытия

**src/components/chat/ChatWindow.tsx**

- `useRealtime` с `useCallback`-мемоизированными callbacks
- `onInsert`: дедупликация по `id`, enrichment с placeholder sender
- `onUpdate`: merge через `{ ...m, ...msg }`
- `onDelete`: soft delete в локальном state (устанавливает `deleted_at`)
- `useTyping` для typing indicator с анимацией `.animate-bounce`
- `markMessagesAsRead` в `useEffect` при монтировании

**src/app/(main)/[groupId]/page.tsx**

- SSR: `fetchMessages(groupId)` для начальных 50 сообщений
- `supabase.auth.getUser()` + профиль для `display_name`
- Заглушка заменена на `<ChatWindow>`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Lint error: unused variable `_groupId`**
- **Found during:** Task 2 lint check
- **Issue:** `groupId: _groupId` деструктурировалось, но не использовалось в теле функции
- **Fix:** Добавлен `// eslint-disable-line @typescript-eslint/no-unused-vars` — prop сохранён в интерфейсе для совместимости с будущим API загрузки файлов
- **Files modified:** src/components/chat/MessageInput.tsx

## Checkpoint: Human Verify Required

Для проверки реалтайма требуется ручная верификация в двух браузерах:

1. Запустить `npm run dev`, открыть http://localhost:3000
2. Войти под двумя аккаунтами (основной браузер + incognito)
3. Открыть одну и ту же группу в обоих браузерах
4. Браузер A отправляет сообщение — должно появиться в B без перезагрузки
5. Браузер B начинает вводить — в A должен показаться typing indicator с именем
6. Hover на сообщение — кнопки Reply/Delete, quick reactions
7. Reply: цитата с именем внутри пузыря
8. Удаление своего сообщения — «Сообщение удалено»
9. Реакции: pill-кнопки под пузырём, toggle работает
10. Прокрутка вверх при > 50 сообщений — «Загрузка...» + старые сообщения добавляются сверху

## Self-Check

- [x] src/components/chat/MessageBubble.tsx exists
- [x] src/components/chat/MessageList.tsx exists
- [x] src/components/chat/MessageInput.tsx exists
- [x] src/components/chat/ChatWindow.tsx exists
- [x] src/app/(main)/[groupId]/page.tsx updated
- [x] `npx tsc --noEmit` — no errors
- [x] `npm run lint` — no errors
- [x] commit fdc7e99 exists

## Self-Check: PASSED
