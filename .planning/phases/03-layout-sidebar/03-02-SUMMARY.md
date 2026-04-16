---
phase: 03-layout-sidebar
plan: "02"
subsystem: sidebar-navigation
tags: [sidebar, telegram-design, client-components, server-components, next-js]
dependency_graph:
  requires: ["03-01"]
  provides: [sidebar, chat-row, folder-list, group-page]
  affects: [app-layout, navigation]
tech_stack:
  added: [lucide-react]
  patterns: [server-component-data-fetch, client-component-interactivity, telegram-dark-ui]
key_files:
  created:
    - src/components/sidebar/ChatRow.tsx
    - src/components/sidebar/FolderList.tsx
    - src/components/sidebar/Sidebar.tsx
    - src/app/(main)/[groupId]/page.tsx
  modified:
    - src/app/(main)/layout.tsx
    - src/app/(main)/page.tsx
    - src/app/globals.css
    - package.json
decisions:
  - "Sidebar как Server Component — данные fetched server-side, только интерактивные дочерние компоненты — client"
  - "ChatRow использует usePathname для активного состояния без props drilling"
  - "Аватар цвет определяется hash от первого символа названия — детерминированный"
metrics:
  duration: "15m"
  completed: "2026-04-15"
  tasks_completed: 7
  files_created: 4
  files_modified: 4
---

# Phase 03 Plan 02: Telegram-style Sidebar Summary

Sidebar навигация в стиле Telegram Dark Mode с Server/Client разделением, аватарами, папками и страницей группы.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Установка lucide-react | 6898925 | package.json |
| 2 | ChatRow — Telegram-style строка чата | 6898925 | src/components/sidebar/ChatRow.tsx |
| 3 | FolderList — папки с collapse | 6898925 | src/components/sidebar/FolderList.tsx |
| 4 | Sidebar — Server Component | 6898925 | src/components/sidebar/Sidebar.tsx |
| 5 | Main layout + страница группы | 6898925 | layout.tsx, page.tsx, [groupId]/page.tsx |
| 6 | globals.css — скроллбар | 6898925 | src/app/globals.css |
| 7 | TypeScript проверка | 6898925 | — |

## What Was Built

**ChatRow** (`src/components/sidebar/ChatRow.tsx`): Client component, полная строка чата в стиле Telegram. Круглый аватар с инициалами (первые буквы слов названия группы), цвет детерминирован hash от первого символа. Активное состояние через `usePathname` — `bg-indigo-600/15`. Счётчик непрочитанных (синий бейдж). Preview последнего сообщения и временная метка. Подгруппы с отступом и меньшим аватаром.

**FolderList** (`src/components/sidebar/FolderList.tsx`): Client component, сворачиваемые папки. `ChevronDown` анимируется `-rotate-90` при collapse через `useState`. Показывает количество чатов в папке. Внутри каждой папки — список `ChatRow`.

**Sidebar** (`src/components/sidebar/Sidebar.tsx`): Server Component, ширина `w-[360px]`, фон `bg-[#17212b]`. Шапка с аватаром профиля (инициал из `display_name`), именем, ролью (Администратор/Сотрудник), кнопкой выхода через `form action={signOut}`. Строка поиска-заглушка. Папки сверху, затем свободные группы с подгруппами. Пустое состояние с иконкой.

**[groupId]/page.tsx**: Server Component, шапка в стиле Telegram (`bg-[#17212b]`) с иконкой `Hash`, названием группы, количеством участников через `Users` иконку. Область сообщений — заглушка для Phase 4.

**layout.tsx**: Обновлён — `flex h-screen overflow-hidden`, `<Sidebar />` слева, `<main>` справа.

**globals.css**: Тонкий 4px скроллбар с `rgba(255,255,255,0.1)` thumb, hover состояние, прозрачный track.

## Deviations from Plan

None - план выполнен точно как написан.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Строка поиска (кнопка без функции) | src/components/sidebar/Sidebar.tsx | Phase 7 — поиск |
| Область сообщений | src/app/(main)/[groupId]/page.tsx | Phase 4 — чат + Realtime |
| `lastMessageText`, `lastMessageTime` не заполнены | ChatRow props | Phase 4 — последнее сообщение из БД |
| `unreadCount` не заполнен | ChatRow props | Phase 4 — счётчик непрочитанных |

Эти заглушки не блокируют цель плана — навигация и структура работают. Данные будут подключены в Phase 4.

## Self-Check: PASSED

- src/components/sidebar/ChatRow.tsx — FOUND
- src/components/sidebar/FolderList.tsx — FOUND
- src/components/sidebar/Sidebar.tsx — FOUND
- src/app/(main)/[groupId]/page.tsx — FOUND
- Commit 6898925 — FOUND
- npx tsc --noEmit — exit 0 (no errors)
