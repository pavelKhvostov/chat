# SPEC.md — Техническая спецификация IntraChat

---

## Модуль 1 — Аутентификация

### User Stories
- Как администратор, я хочу зарегистрировать нового сотрудника через email и пароль, чтобы он получил доступ к мессенджеру
- Как сотрудник, я хочу войти через email и пароль, чтобы попасть в свой аккаунт
- Как пользователь, я хочу оставаться залогиненным при следующем открытии приложения
- Как администратор, я хочу деактивировать учётную запись сотрудника, чтобы заблокировать доступ

### Модель данных

```sql
-- Таблица users (расширение Supabase auth.users)
profiles (
  id           uuid PK REFERENCES auth.users(id),
  full_name    text NOT NULL,
  avatar_url   text,
  role         text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
)

RLS:
  SELECT: auth.uid() IS NOT NULL (любой авторизованный видит профили)
  UPDATE: auth.uid() = id (только свой профиль)
  UPDATE role/is_active: role = 'admin' (только admin)
```

### API (Server Actions)
- `signIn(email, password)` → session | 401 неверные данные | 403 деактивирован
- `signOut()` → void
- `createUser(email, password, full_name)` → profile | 409 email занят | 403 не admin
- `deactivateUser(userId)` → void | 403 не admin
- `updateProfile(full_name, avatar_url)` → profile

### Экраны
- `/login` — форма email + пароль, кнопка "Войти". Состояния: loading, error (неверные данные), error (деактивирован)
- Редирект на `/` после успешного входа
- Нет регистрации для пользователей — только admin создаёт аккаунты через `/admin/users`

### Крайние случаи
- Неверный пароль → "Неверный email или пароль" (не уточнять что именно)
- Деактивированный пользователь → "Ваш аккаунт заблокирован, обратитесь к администратору"
- Истёкшая сессия → редирект на `/login` с сохранением intended URL

---

## Модуль 2 — Управление группами и папками

### User Stories
- Как администратор, я хочу создать группу верхнего уровня (например "Ресторан №26219"), чтобы объединить сотрудников
- Как администратор, я хочу создать подгруппу внутри группы (например "Отдел производства"), чтобы разделить команды
- Как пользователь, я хочу создать личную папку (например "Работа"), чтобы организовать свои чаты
- Как администратор, я хочу добавлять и удалять участников из группы
- Как пользователь, я хочу добавить чат в личную папку

### Модель данных

```sql
groups (
  id          uuid PK DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  parent_id   uuid REFERENCES groups(id) ON DELETE CASCADE,
  created_by  uuid NOT NULL REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
)
-- parent_id = NULL → группа верхнего уровня
-- parent_id = <id> → подгруппа (макс. 2 уровня)

RLS:
  SELECT: участник группы или admin
  INSERT/UPDATE/DELETE: role = 'admin'

group_members (
  group_id    uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
)

RLS:
  SELECT: auth.uid() = user_id OR role = 'admin'
  INSERT/DELETE: role = 'admin'

folders (
  id          uuid PK DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
)

RLS:
  ALL: auth.uid() = user_id

folder_items (
  folder_id   uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  group_id    uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (folder_id, group_id)
)

RLS:
  ALL: folder.user_id = auth.uid()
```

### API (Server Actions)
- `createGroup(name, parent_id?)` → group | 403 не admin | 400 превышен уровень вложенности
- `updateGroup(id, name)` → group | 403 не admin
- `deleteGroup(id)` → void | 403 не admin
- `addMember(group_id, user_id)` → void | 403 не admin
- `removeMember(group_id, user_id)` → void | 403 не admin
- `createFolder(name)` → folder
- `deleteFolder(id)` → void
- `addToFolder(folder_id, group_id)` → void
- `removeFromFolder(folder_id, group_id)` → void

### Экраны
- Левая панель: список папок пользователя → группы внутри папки → подгруппы
- `/admin/groups` — управление группами (только admin): создать группу/подгруппу, добавить участников
- Drag-and-drop добавления чата в папку (или через контекстное меню)

### Крайние случаи
- Попытка создать подгруппу у подгруппы → 400 "Максимум 2 уровня вложенности"
- Удаление группы с сообщениями → каскадное удаление всех данных, подтверждение перед удалением
- Пользователь исключён из группы → теряет доступ к истории

---

## Модуль 3 — Сообщения в реальном времени

### User Stories
- Как пользователь, я хочу отправить текстовое сообщение в группу и видеть его мгновенно
- Как пользователь, я хочу ответить на конкретное сообщение (reply)
- Как пользователь, я хочу видеть статус "доставлено" и "прочитано" под своим сообщением
- Как пользователь, я хочу видеть индикатор "печатает..."
- Как пользователь, я хочу закрепить важное сообщение в чате

### Модель данных

```sql
messages (
  id            uuid PK DEFAULT gen_random_uuid(),
  group_id      uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id     uuid NOT NULL REFERENCES profiles(id),
  content       text,
  reply_to_id   uuid REFERENCES messages(id),
  is_pinned     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz,
  deleted_at    timestamptz
)
-- content = NULL если только вложение
-- deleted_at != NULL → soft delete, показываем "Сообщение удалено"

RLS:
  SELECT: участник группы
  INSERT: участник группы
  UPDATE is_pinned: role = 'admin' OR sender_id = auth.uid()
  UPDATE deleted_at: sender_id = auth.uid() (только своё)

message_reads (
  message_id  uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
)

RLS:
  SELECT: участник группы
  INSERT: auth.uid() = user_id
```

### API
- `sendMessage(group_id, content, reply_to_id?)` → message
- `deleteMessage(id)` → void (soft delete)
- `pinMessage(id)` → void | 403
- `unpinMessage(id)` → void | 403
- `markAsRead(group_id)` → void (помечает все непрочитанные)
- `getPinnedMessages(group_id)` → message[]

**Realtime:** Supabase channel `group:{group_id}` — подписка на INSERT в messages

### Экраны
- Область чата: список сообщений с пагинацией (50 шт., load more вверх)
- Сообщение: аватар, имя, время, контент, статус (✓ доставлено / ✓✓ прочитано)
- Reply: цитата оригинального сообщения над текстом
- Закреплённые: плашка вверху чата с иконкой и текстом
- Индикатор "печатает...": через Supabase Presence

### Крайние случаи
- Offline → сообщение в очереди, отправляется при восстановлении соединения
- Пустой чат → "Начните общение первым"
- Удалённое сообщение → "Сообщение удалено" (серым цветом)
- Reply на удалённое → "Оригинальное сообщение удалено"

---

## Модуль 4 — Вложения (фото, файлы, голос, видео-кружки)

### User Stories
- Как пользователь, я хочу отправить фото из галереи или сделать снимок камерой
- Как пользователь, я хочу отправить файл любого формата (документ, таблица)
- Как пользователь, я хочу записать и отправить голосовое сообщение
- Как пользователь, я хочу записать и отправить видео-кружок (круглое видео)
- Как пользователь, я хочу скачать полученный файл

### Модель данных

```sql
message_attachments (
  id            uuid PK DEFAULT gen_random_uuid(),
  message_id    uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  type          text NOT NULL CHECK (type IN ('image', 'file', 'voice', 'video_circle')),
  storage_path  text NOT NULL,
  file_name     text,
  file_size     int,
  duration_sec  int,
  created_at    timestamptz NOT NULL DEFAULT now()
)

RLS:
  SELECT: участник группы через message
  INSERT: участник группы
```

**Supabase Storage:** bucket `attachments` (private)
- Путь: `{group_id}/{message_id}/{filename}`
- Лимиты: изображения до 10MB, файлы до 50MB, голос до 5MB, видео-кружок до 30MB

### API
- `uploadAttachment(file, type, group_id)` → storage_path | 413 слишком большой
- `getAttachmentUrl(storage_path)` → signed URL (expires 1h)
- `sendMessageWithAttachment(group_id, storage_path, type, file_name, file_size, duration_sec?)` → message

### Экраны
- Кнопка скрепки в поле ввода → меню: Фото/Видео, Файл, Голосовое, Видео-кружок
- Голосовое: кнопка-микрофон (удержать для записи), волна амплитуды, кнопка отправить/отменить
- Видео-кружок: круглый preview, таймер записи (макс. 60 сек)
- В чате: изображения — inline preview с tap для полного экрана; файлы — иконка + название + размер + кнопка скачать; голос — плеер с прогресс-баром и временем; видео-кружок — круглый видеоплеер

### Крайние случаи
- Файл превышает лимит → "Файл слишком большой. Максимум {N}MB"
- Ошибка загрузки → "Не удалось загрузить файл. Попробуйте ещё раз"
- Неподдерживаемый формат для превью → показать как обычный файл
- Браузер не поддерживает запись → скрыть кнопки записи, показать только загрузку файла

---

## Модуль 5 — Реакции и поиск

### User Stories
- Как пользователь, я хочу поставить эмодзи-реакцию на сообщение
- Как пользователь, я хочу найти сообщение по ключевому слову в конкретном чате
- Как пользователь, я хочу найти нужный чат или пользователя через глобальный поиск

### Модель данных

```sql
message_reactions (
  message_id  uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
)

RLS:
  SELECT: участник группы через message
  INSERT/DELETE: auth.uid() = user_id
```

### API
- `addReaction(message_id, emoji)` → void
- `removeReaction(message_id, emoji)` → void
- `searchMessages(group_id, query)` → message[] (полнотекстовый поиск, до 20 результатов)
- `searchChats(query)` → group[] (поиск по названию группы, только доступные)

### Экраны
- Long-press на сообщение → меню реакций (8 популярных эмодзи + кнопка ещё)
- Реакции под сообщением: пилюли с эмодзи + счётчик, подсвечены если ты поставил
- Иконка поиска в шапке чата → поле поиска → результаты с подсветкой совпадений
- Глобальный поиск в левой панели — поиск по чатам и пользователям

### Крайние случаи
- Пустые результаты поиска → "Ничего не найдено по запросу «{query}»"
- Поиск менее 2 символов → не выполнять запрос
- Удалённые сообщения не появляются в результатах поиска

---

## Модуль 6 — Личные переписки (Direct Messages)

### User Stories
- Как пользователь, я хочу написать другому сотруднику напрямую (не в группу)
- Как пользователь, я хочу видеть список своих личных переписок

### Модель данных

```sql
direct_chats (
  id            uuid PK DEFAULT gen_random_uuid(),
  user1_id      uuid NOT NULL REFERENCES profiles(id),
  user2_id      uuid NOT NULL REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id))
)

direct_messages (
  id            uuid PK DEFAULT gen_random_uuid(),
  chat_id       uuid NOT NULL REFERENCES direct_chats(id) ON DELETE CASCADE,
  sender_id     uuid NOT NULL REFERENCES profiles(id),
  content       text,
  reply_to_id   uuid REFERENCES direct_messages(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
)

RLS:
  SELECT/INSERT: auth.uid() IN (user1_id, user2_id)
```

### API
- `getOrCreateDirectChat(other_user_id)` → direct_chat
- `sendDirectMessage(chat_id, content, reply_to_id?)` → message

### Экраны
- Секция "Личные сообщения" в левой панели под папками
- Список DM: аватар, имя, последнее сообщение, время, счётчик непрочитанных
- Чат DM: идентичен групповому, без функций закрепа и управления участниками

---

## Модуль 7 — Администрирование

### User Stories
- Как администратор, я хочу создавать новых пользователей
- Как администратор, я хочу видеть список всех пользователей и управлять ими
- Как администратор, я хочу управлять всеми группами

### Экраны
- `/admin/users` — таблица пользователей: имя, email, роль, статус, дата регистрации. Действия: создать, деактивировать, сменить роль
- `/admin/groups` — дерево групп. Действия: создать группу/подгруппу, переименовать, удалить, управлять участниками
- Доступ только при `role = 'admin'`, иначе редирект на `/`

---

## Модуль 8 — PWA и уведомления

### Конфигурация PWA
- `manifest.json`: name "IntraChat", short_name "IntraChat", display "standalone", theme_color корпоративный
- Service Worker: кэширование статики, offline-страница
- Icons: 192x192, 512x512

### Push-уведомления (v2, не MVP)
- В MVP: badge-счётчик непрочитанных в title браузера (`document.title`)
- В MVP: звуковой сигнал при новом сообщении (Web Audio API)

---

## Стек и инфраструктура

| Слой | Технология |
|---|---|
| Фронтенд | Next.js 14, App Router, TypeScript |
| Стили | Tailwind CSS |
| База данных | Supabase (PostgreSQL) |
| Аутентификация | Supabase Auth |
| Реальное время | Supabase Realtime |
| Хранилище файлов | Supabase Storage |
| Хостинг | Vercel |
| PWA | next-pwa или @ducanh2912/next-pwa |
