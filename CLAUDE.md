# IntraChat — Корпоративный мессенджер

## Обзор

PWA-мессенджер для внутренней корпоративной коммуникации (~100 пользователей).
Иерархия: Группы → Подгруппы → Сообщения. Личные папки, DM, вложения, реакции, поиск.

## Стек

- Next.js 14 (App Router, Server Actions, TypeScript)
- Tailwind CSS
- Supabase (Auth, PostgreSQL, Realtime, Storage)
- Vercel (деплой)
- next-pwa (PWA manifest + service worker)

## Архитектура

```
src/
  app/
    (auth)/login/          — страница входа
    (main)/                — layout с левой панелью
      page.tsx             — редирект на первый чат
      [groupId]/           — чат группы
      dm/[chatId]/         — личная переписка
    admin/
      users/               — управление пользователями
      groups/              — управление группами
    api/                   — API routes (upload)
  components/
    chat/                  — ChatWindow, MessageList, MessageInput, MessageBubble
    sidebar/               — Sidebar, FolderList, GroupTree
    ui/                    — Button, Input, Avatar, Modal
  lib/
    supabase/              — client.ts, server.ts, middleware.ts
    actions/               — server actions по модулям
    types/                 — database.types.ts
  hooks/                   — useRealtime, usePresence, useMediaRecorder
supabase/
  migrations/              — SQL миграции
  functions/               — Edge Functions (если нужны)
```

## Правила

### Обязательно

- Все серверные операции — через Server Actions в `lib/actions/`
- RLS включён для всех таблиц без исключений
- Типы из `lib/types/database.types.ts` (генерируются `supabase gen types`)
- Realtime только через хук `useRealtime` — не дублировать подписки
- Файлы загружать через `/api/upload` route, не напрямую с клиента
- Проверять `role = 'admin'` на сервере, не только на клиенте

### Запрещено

- `any` в TypeScript
- Прямые SQL-запросы в компонентах (только через Server Actions)
- Хранить секреты в клиентском коде
- Отключать RLS

### Именование

- Компоненты: PascalCase (`MessageBubble.tsx`)
- Server Actions: camelCase глагол+существительное (`sendMessage`, `createGroup`)
- Таблицы БД: snake_case множественное число (`message_reactions`)
- CSS: только Tailwind utility classes

## Команды

```bash
npm run dev          # запуск локально
npm run build        # сборка
npm run lint         # линтер
supabase start       # локальный Supabase
supabase db push     # применить миграции
supabase gen types typescript --local > src/lib/types/database.types.ts
```

## Переменные окружения (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Порядок реализации

1. Миграции БД + RLS (database-architect)
2. Аутентификация + middleware (backend-engineer)
3. Layout + левая панель + группы (frontend-developer)
4. Чат + Realtime (frontend-developer + backend-engineer)
5. Вложения (backend-engineer + frontend-developer)
6. Реакции, поиск, закреп (frontend-developer)
7. Админ-панель (frontend-developer)
8. PWA конфигурация (frontend-developer)
9. QA review (qa-reviewer)

## Дизайн — принципы

- Избегай generic AI-дизайна: никаких фиолетовых градиентов, скучных карточек, системных шрифтов
- Тёмная тема: глубокий тёмно-синий (#0f0f1a) основной фон, не серый
- Акцентный цвет: выбери один неожиданный (например индиго, электрик, янтарь) и используй последовательно
- Типографика: Inter для текста + JetBrains Mono для меток/времени
- Сообщения: тонкие пузыри с лёгким blur-backdrop, не жирные прямоугольники
- Sidebar: чуть светлее фона, тонкий разделитель, папки с иконками
- Анимации: плавные переходы 150-200ms, сообщения появляются снизу
- Иконки: Lucide React — тонкие, последовательные
- Никаких рамок и теней везде — только там где нужна глубина
