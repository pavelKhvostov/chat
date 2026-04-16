# ROADMAP: IntraChat

**Project:** IntraChat
**Milestone:** v1
**Created:** 2026-04-15
**Granularity:** Standard
**Coverage:** 52/52 v1 requirements mapped

---

## Phases

- [ ] **Phase 1: Database & Schema** - Полная схема БД с RLS, Storage bucket, миграции применены к Supabase Cloud
- [ ] **Phase 2: Authentication** - Вход по email+password, сессия, middleware, защита роутов
- [ ] **Phase 3: Layout & Sidebar** - Root layout, Sidebar с иерархией групп и личными папками
- [x] **Phase 4: Chat & Realtime** - Текстовые сообщения в реальном времени, статусы прочтения, реакции (completed 2026-04-16)
- [ ] **Phase 5: Attachments** - Фото, файлы, голосовые сообщения, видео-кружки
- [ ] **Phase 6: DM & Presence** - Личная переписка, индикатор "печатает..."
- [ ] **Phase 7: Search & Pinned** - Поиск по чатам и сообщениям, закреп сообщений
- [ ] **Phase 8: Admin Panel** - Управление пользователями и группами
- [ ] **Phase 9: PWA** - Manifest, service worker, установка на домашний экран
- [ ] **Phase 10: QA** - Security review, RLS audit, исправление багов

---

## Phase Details

### Phase 1: Database & Schema
**Goal**: Полная схема PostgreSQL с RLS-политиками, Storage bucket и Realtime применены к Supabase Cloud; сгенерированы TypeScript типы.
**Depends on**: Nothing
**Requirements**: DB-01, DB-02, DB-03, DB-04, DB-05, DB-06, DB-07, DB-08, DB-09, DB-10
**Success Criteria** (what must be TRUE):
  1. `supabase db push` выполняется без ошибок
  2. Все таблицы имеют RLS enabled (проверяется через `SELECT tablename FROM pg_tables WHERE schemaname='public'`)
  3. `supabase gen types typescript --local` генерирует корректный `database.types.ts`
  4. Storage bucket "attachments" существует с правильными политиками
  5. Realtime включён для таблиц messages и direct_messages

### Phase 2: Authentication
**Goal**: Пользователь входит по email+password, сессия сохраняется после перезагрузки, middleware перенаправляет неавторизованных на /login, роут /admin защищён.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. Страница /login рендерится без ошибок
  2. Успешный вход перенаправляет на главный чат
  3. Обновление страницы не разлогинивает пользователя
  4. Переход на /admin без роли admin возвращает 403/redirect

### Phase 3: Layout & Sidebar
**Goal**: Пользователь видит левую панель с иерархией групп (2 уровня) и личными папками, может переходить между группами.
**Depends on**: Phase 2
**Requirements**: GRP-01, GRP-02, GRP-03, GRP-04, GRP-05
**Success Criteria** (what must be TRUE):
  1. Sidebar отображает группы с подгруппами корректно
  2. Личные папки отображаются и разворачиваются
  3. Переход по группам меняет URL и контент
  4. Активная группа подсвечена в sidebar

### Phase 4: Chat & Realtime
**Goal**: Пользователи обмениваются текстовыми сообщениями в реальном времени, видят статусы прочтения ✓/✓✓ и реакции.
**Depends on**: Phase 3
**Requirements**: MSG-01, MSG-02, MSG-03, MSG-04, MSG-05, MSG-06, MSG-07, MSG-08
**Success Criteria** (what must be TRUE):
  1. Сообщение появляется у получателя без перезагрузки (< 500ms)
  2. Reply отображает цитату с именем и текстом
  3. Статус ✓ меняется на ✓✓ после прочтения
  4. Реакция отображается у всех участников в реальном времени

### Phase 5: Attachments
**Goal**: Пользователь отправляет фото (≤10MB), файлы (≤50MB), голосовые (WebM ≤5MB) и видео-кружки (MP4 ≤30MB ≤60сек).
**Depends on**: Phase 4
**Requirements**: ATT-01, ATT-02, ATT-03, ATT-04, ATT-05, ATT-06, ATT-07, ATT-08
**Success Criteria** (what must be TRUE):
  1. Изображение отправляется и отображается в чате с превью
  2. Голосовое сообщение записывается и воспроизводится встроенным плеером
  3. Видео-кружок записывается, отображается круглым, воспроизводится
  4. Файл-карточка показывает имя, размер и ссылку на скачивание
  5. Файлы > лимита отклоняются с сообщением об ошибке

### Phase 6: DM & Presence
**Goal**: Пользователи переписываются в личке, видят индикатор "печатает..." в реальном времени.
**Depends on**: Phase 5
**Requirements**: DM-01, DM-02, DM-03, DM-04, MSG-06
**Success Criteria** (what must be TRUE):
  1. DM-чат открывается с любым пользователем из списка
  2. "Печатает..." появляется в течение 500ms после начала набора
  3. Все типы вложений работают в DM

### Phase 7: Search & Pinned
**Goal**: Пользователь находит чаты и сообщения через поиск, видит закреплённые сообщения в шапке.
**Depends on**: Phase 4
**Requirements**: SCH-01, SCH-02, PIN-01, PIN-02
**Success Criteria** (what must be TRUE):
  1. Поиск по названию группы возвращает результаты мгновенно
  2. Полнотекстовый поиск по сообщениям возвращает релевантные результаты
  3. Закреплённое сообщение видно в шапке чата

### Phase 8: Admin Panel
**Goal**: Администратор управляет пользователями и группами через веб-интерфейс /admin.
**Depends on**: Phase 3
**Requirements**: ADM-01, ADM-02, ADM-03, ADM-04
**Success Criteria** (what must be TRUE):
  1. /admin недоступен для роли user
  2. Новый пользователь создаётся и может войти
  3. Деактивированный пользователь не может войти
  4. Группа создаётся, редактируется, удаляется

### Phase 9: PWA
**Goal**: Приложение устанавливается на iOS и Android как нативное с иконкой и splash-screen.
**Depends on**: Phase 2
**Requirements**: PWA-01, PWA-02, PWA-03, PWA-04
**Success Criteria** (what must be TRUE):
  1. Chrome на Android показывает баннер "Добавить на главный экран"
  2. Safari на iOS позволяет добавить на домашний экран с правильной иконкой
  3. Приложение открывается в standalone-режиме (без адресной строки)

### Phase 10: QA
**Goal**: Все критичные баги исправлены, RLS проверен, финальная сборка без ошибок.
**Depends on**: Phase 9
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, DB-08
**Success Criteria** (what must be TRUE):
  1. `npm run build` завершается без ошибок и warnings
  2. qa-reviewer не находит критичных нарушений RLS
  3. Нет service_role ключа в клиентском коде
  4. Все Signed URLs используются вместо публичных ссылок
