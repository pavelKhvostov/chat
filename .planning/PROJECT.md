# IntraChat

## What This Is

PWA-мессенджер для внутренней корпоративной коммуникации ~100 сотрудников предприятия. Иерархия: Группы → Подгруппы → Сообщения. Полный набор функций современного мессенджера: DM, вложения, голосовые и видео-кружки, реакции, поиск, закреп, статусы прочтения. Не Telegram — потому что Telegram нельзя.

## Core Value

Сотрудник открывает приложение и мгновенно видит живой корпоративный чат — сообщения приходят в реальном времени, файлы отправляются без лагов, всё работает как в Telegram, но на инфраструктуре компании.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Аутентификация через email+password, роли admin/user
- [ ] Иерархия групп: верхний уровень + подгруппы (2 уровня)
- [ ] Личные папки для организации групп
- [ ] Текстовые сообщения в реальном времени (Supabase Realtime)
- [ ] DM (личная переписка между пользователями)
- [ ] Отправка фото (≤10MB) и файлов (≤50MB)
- [ ] Голосовые сообщения (WebM, ≤5MB)
- [ ] Видео-кружки (MP4, ≤30MB, max 60 сек, круглый плеер)
- [ ] Reply на сообщение (цитата)
- [ ] Реакции (эмодзи)
- [ ] Закреп сообщений
- [ ] Статус доставки/прочтения (✓/✓✓)
- [ ] Поиск по чатам и сообщениям
- [ ] Индикатор "печатает..." (Supabase Presence)
- [ ] Админ-панель: управление пользователями и группами
- [ ] PWA: manifest, service worker, добавление на домашний экран

### Out of Scope

- Внешние OAuth (Google, Apple) — лишняя сложность, корпоративный продукт
- Видеозвонки — отдельная задача, не для v1
- Боты и интеграции — v2+
- E2E-шифрование — не является требованием корпоративной среды
- iOS/Android нативные приложения — PWA достаточно

## Context

- Supabase Cloud проект уже создан, URL и ключи есть
- ~100 пользователей — масштаб не требует сложных оптимизаций, но RLS обязателен
- Корпоративный запрет на публичные мессенджеры (Telegram, WhatsApp) — основная мотивация
- Стек зафиксирован: Next.js 14 App Router, Tailwind, Supabase, Vercel
- Субагенты уже описаны: database-architect, backend-engineer, frontend-developer, qa-reviewer
- Дизайн: тёмная тема (#0f0f1a), акцент — индиго/электрик, Inter + JetBrains Mono

## Constraints

- **Tech Stack**: Next.js 14 + Supabase + Vercel — зафиксирован, не менять
- **Security**: RLS включён для всех таблиц без исключений
- **TypeScript**: запрещён `any`, типы из `database.types.ts`
- **Architecture**: Server Actions для всех мутаций, `useRealtime` для подписок
- **Scale**: ~100 пользователей, одно предприятие

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 14 App Router | Server Actions + Server Components из коробки | — Pending |
| Supabase Realtime | WebSocket подписки встроены, не нужен отдельный WS-сервер | — Pending |
| PWA вместо нативных приложений | Скорость запуска, один кодбейс | — Pending |
| Роли только admin/user | Корпоративная простота, не нужна сложная иерархия ролей | — Pending |
| Soft delete для сообщений | Сохраняем историю, пользователь видит "[сообщение удалено]" | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-15 after initialization*
