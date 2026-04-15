# Roadmap: IntraChat

**Created:** 2026-04-15
**Milestone:** v1.0 — Корпоративный мессенджер (MVP)
**Goal:** Полнофункциональный PWA-мессенджер для ~100 сотрудников

---

## Phase 1 — База данных и схема

**Goal:** Полная схема БД с RLS, Storage bucket, миграции применены к Supabase Cloud.

**Requirements:** DB-01..DB-10

**Plans:**
1. Создать миграцию: таблицы profiles, groups, group_members, folders, folder_items
2. Создать миграцию: messages, message_reads, message_reactions, message_attachments
3. Создать миграцию: direct_chats, direct_messages
4. RLS-политики для всех таблиц
5. Storage bucket "attachments" + политики доступа
6. Включить Realtime для messages и direct_messages
7. Сгенерировать `database.types.ts`

**Depends on:** —
**Agent:** database-architect

---

## Phase 2 — Аутентификация и middleware

**Goal:** Пользователь входит по email+password, сессия сохраняется, неавторизованный редиректится на /login.

**Requirements:** AUTH-01..AUTH-05

**Plans:**
1. Страница `/login` с формой (email + пароль)
2. Server Actions: `signIn`, `signOut`
3. Middleware: проверка сессии, редирект
4. `createServerClient` / `createBrowserClient` в lib/supabase/
5. Защита роута `/admin` — только для role=admin

**Depends on:** Phase 1
**Agent:** backend-engineer + frontend-developer

---

## Phase 3 — Layout, Sidebar, группы, папки

**Goal:** Пользователь видит левую панель с иерархией групп и личными папками, может переходить между группами.

**Requirements:** GRP-01..GRP-05

**Plans:**
1. Root layout `(main)` с Sidebar + основная область
2. Компонент Sidebar: список групп (2 уровня), папки, DM-секция
3. Server Action: `getGroups`, `getFolders`, `getFolderItems`
4. Страница `[groupId]/page.tsx` — заглушка чата
5. Создание/перемещение групп в папки (Server Actions)

**Depends on:** Phase 2
**Agent:** frontend-developer + backend-engineer

---

## Phase 4 — Чат и Realtime

**Goal:** Пользователи обмениваются текстовыми сообщениями в реальном времени, видят статусы прочтения.

**Requirements:** MSG-01..MSG-08

**Plans:**
1. `ChatWindow` + `MessageList` + `MessageInput` компоненты
2. `useRealtime` хук — подписка на новые сообщения в группе
3. Server Actions: `sendMessage`, `deleteMessage`, `markAsRead`
4. Infinite scroll / pagination истории сообщений
5. Reply-UI — цитата при ответе
6. Статусы ✓/✓✓ на пузырях своих сообщений
7. Реакции: `addReaction`, `removeReaction`, оверлей эмодзи
8. Realtime для реакций и статусов прочтения

**Depends on:** Phase 3
**Agent:** frontend-developer + backend-engineer

---

## Phase 5 — Вложения

**Goal:** Пользователь отправляет фото, файлы, голосовые сообщения и видео-кружки.

**Requirements:** ATT-01..ATT-08

**Plans:**
1. `/api/upload` route: приём FormData, валидация, загрузка в Storage
2. `useMediaRecorder` хук — запись голоса и видео-кружков
3. UI: кнопки вложений в MessageInput (скрепка, микрофон, кружок)
4. `MessageBubble` — отображение вложений: изображение, файл-карточка, аудиоплеер
5. Круглый видеоплеер для видео-кружков
6. Lightbox для просмотра изображений в полном размере
7. Signed URLs через Server Action `getAttachmentUrl`

**Depends on:** Phase 4
**Agent:** backend-engineer + frontend-developer

---

## Phase 6 — DM и индикатор "печатает..."

**Goal:** Пользователи переписываются в личке, видят индикатор набора текста.

**Requirements:** DM-01..DM-04, MSG-06

**Plans:**
1. Server Actions: `getOrCreateDirectChat`, `sendDirectMessage`
2. Страница `dm/[chatId]/page.tsx` — тот же ChatWindow, другой источник
3. `usePresence` хук — Supabase Presence для "печатает..."
4. DM-секция в Sidebar с именами участников
5. Статус прочтения в DM (те же механизмы)

**Depends on:** Phase 5
**Agent:** frontend-developer + backend-engineer

---

## Phase 7 — Поиск и закреп

**Goal:** Пользователь находит сообщения/чаты через поиск, видит закреплённые сообщения.

**Requirements:** SCH-01..SCH-02, PIN-01..PIN-02

**Plans:**
1. Глобальная строка поиска в шапке Sidebar
2. Server Action `searchGroups` — поиск по названиям
3. Server Action `searchMessages` — full-text поиск в открытом чате (PostgreSQL `to_tsvector`)
4. Компонент результатов поиска
5. Server Actions: `pinMessage`, `unpinMessage`
6. Отображение закреплённого сообщения под шапкой чата

**Depends on:** Phase 4
**Agent:** frontend-developer + backend-engineer

---

## Phase 8 — Админ-панель

**Goal:** Администратор управляет пользователями и группами через веб-интерфейс.

**Requirements:** ADM-01..ADM-04

**Plans:**
1. Layout `/admin` — проверка роли на сервере
2. Страница `/admin/users` — список, создание, деактивация
3. Страница `/admin/groups` — CRUD групп, управление участниками
4. Server Actions: `createUser`, `deactivateUser`, `createGroup`, `updateGroup`, `deleteGroup`, `addMember`, `removeMember`

**Depends on:** Phase 3
**Agent:** frontend-developer + backend-engineer

---

## Phase 9 — PWA

**Goal:** Приложение устанавливается на iOS и Android как нативное.

**Requirements:** PWA-01..PWA-04

**Plans:**
1. `next-pwa` конфигурация в `next.config.js`
2. `manifest.json` — имя, описание, иконки (192x192, 512x512), тема
3. Иконки приложения (dark theme, логотип IntraChat)
4. Метатеги в root layout (`apple-touch-icon`, `theme-color`, `viewport`)
5. Тест установки на iOS (Safari) и Android (Chrome)

**Depends on:** Phase 2
**Agent:** frontend-developer

---

## Phase 10 — QA и полировка

**Goal:** Все критичные баги исправлены, RLS проверен, UX без явных проблем.

**Plans:**
1. QA-агент: проверка RLS-политик для всех таблиц
2. QA-агент: security review (нет service_role на клиенте, Signed URLs, проверка роли)
3. QA-агент: функциональное тестирование edge cases
4. Исправление найденных проблем
5. Финальный `npm run build` — без ошибок

**Depends on:** Phase 9
**Agent:** qa-reviewer

---

## Milestone Summary

| Phase | Name | Agent | Deps |
|-------|------|-------|------|
| 1 | База данных и схема | database-architect | — |
| 2 | Аутентификация | backend + frontend | 1 |
| 3 | Layout + Sidebar + группы | frontend + backend | 2 |
| 4 | Чат + Realtime | frontend + backend | 3 |
| 5 | Вложения | backend + frontend | 4 |
| 6 | DM + "печатает..." | frontend + backend | 5 |
| 7 | Поиск + закреп | frontend + backend | 4 |
| 8 | Админ-панель | frontend + backend | 3 |
| 9 | PWA | frontend | 2 |
| 10 | QA + полировка | qa-reviewer | 9 |

---
*Created: 2026-04-15*
