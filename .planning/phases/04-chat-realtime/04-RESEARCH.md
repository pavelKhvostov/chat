# Phase 4: Chat & Realtime — Research

**Исследовано:** 2026-04-15
**Домен:** Supabase Realtime, Supabase Presence, React infinite scroll, Next.js 14 App Router
**Уверенность:** HIGH

---

## Summary

Фаза реализует ключевое требование продукта: живой чат в реальном времени с историей сообщений, статусами прочтения и реакциями. Технологически всё строится на Supabase Realtime (postgres_changes для INSERT/UPDATE/DELETE сообщений) и Supabase Presence (typing indicator). Клиентский клиент создаётся через `createBrowserClient` из `@supabase/ssr` — именно он используется в хуках, а не серверный.

**Главный принцип:** единственный хук `useRealtime` управляет всеми WebSocket-подписками. Дублирование подписок запрещено правилами проекта (`CLAUDE.md`). Мутации (отправить сообщение, удалить, поставить реакцию) — только через Server Actions.

**Главная рекомендация:** подписываться на канал `group:${groupId}` с фильтром `group_id=eq.${groupId}` для messages, отдельный presence-канал `typing:${groupId}` для индикатора печатания.

---

## Project Constraints (from CLAUDE.md)

- Все серверные операции — через Server Actions в `lib/actions/`
- RLS включён для всех таблиц без исключений
- Типы из `lib/types/database.types.ts` — запрещён `any`
- Realtime только через хук `useRealtime` — не дублировать подписки
- Компоненты: PascalCase, Server Actions: camelCase глагол+существительное
- CSS: только Tailwind utility classes
- Lucide React для иконок

---

<phase_requirements>
## Phase Requirements

| ID | Описание | Поддержка исследования |
|----|----------|------------------------|
| MSG-01 | Realtime-доставка через Supabase Realtime | Суспект канал `group:${groupId}` + postgres_changes INSERT |
| MSG-02 | История сообщений с infinite scroll (cursor-based) | Keyset pagination по `created_at DESC` + `id`, IntersectionObserver для триггера |
| MSG-03 | Reply на сообщение (цитата с именем и текстом) | Поле `reply_to` в таблице `messages` уже есть; JOIN при запросе истории |
| MSG-04 | Помечать сообщения прочитанными при открытии чата | Batch INSERT в `message_reads` при монтировании ChatWindow |
| MSG-05 | Статус ✓/✓✓ для своих сообщений | Считать записи в `message_reads` для данного message_id |
| MSG-06 | Typing indicator через Supabase Presence | Канал `typing:${groupId}`, `channel.track({ userId, typing: true })` |
| MSG-07 | Soft delete своего сообщения | UPDATE `deleted_at = now()` через Server Action, Realtime UPDATE триггер |
| MSG-08 | Реакции — добавить/убрать | UNIQUE (message_id, user_id, emoji) в БД; toggle: upsert если нет, delete если есть |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Загрузка истории сообщений | Server Component / Server Action | — | Первая страница — SSR, последующие — Server Action |
| Realtime подписки | Browser (Client Component, `useRealtime`) | — | WebSocket — только клиентская сторона |
| Typing indicator | Browser (`usePresence`) | — | Presence — только браузер |
| Отправка/удаление/реакции (мутации) | Server Action | — | Правило CLAUDE.md |
| Статус прочтения (INSERT batch) | Server Action (вызывается из useEffect) | — | RLS на server; useEffect триггерит |
| Рендер сообщений | Client Component | — | Нужна интерактивность и real-time обновление state |

---

## Standard Stack

### Core (уже в проекте)

| Библиотека | Версия | Назначение |
|-----------|--------|-----------|
| `@supabase/ssr` | текущая | `createBrowserClient` для хуков |
| `@supabase/supabase-js` | v2.58.0 | Realtime channels, Presence |
| `next` | 14 | App Router, Server Actions |
| `tailwindcss` | текущая | Стилизация |
| `lucide-react` | текущая | Иконки (Check, CheckCheck, Smile, Trash2, Reply) |

### Нужно добавить

| Библиотека | Версия | Назначение | Когда использовать |
|-----------|--------|-----------|-------------------|
| `emoji-mart` | ^5 | Emoji picker для реакций | При нажатии на "+" под сообщением |

**Альтернатива emoji-mart:** можно обойтись хардкодом 6-8 эмодзи (👍❤️😂😮😢👏) без пикера — проще, 0 зависимостей. Рекомендую именно этот подход для v1.

---

## Architecture Patterns

### Поток данных

```
URL /[groupId]
       │
       ▼
Server Component (page.tsx)
  └── fetchMessages(groupId, cursor=null)   ← первые 50 через Server Action
       │
       ▼
ChatWindow (Client Component)
  ├── useRealtime(groupId)                  ← WebSocket подписка на INSERT/UPDATE/DELETE
  ├── usePresence(groupId, userId)          ← Typing indicator
  ├── MessageList                           ← рендер + IntersectionObserver для пагинации
  │     └── MessageBubble (per message)
  │           └── ReactionBar
  └── MessageInput
        ├── onSend → sendMessage() Server Action
        └── onTyping → channel.track()
```

### Рекомендуемая структура файлов

```
src/
  components/
    chat/
      ChatWindow.tsx          — оркестратор (Client Component)
      MessageList.tsx         — список + infinite scroll trigger
      MessageBubble.tsx       — один пузырь (своё/чужое)
      MessageInput.tsx        — поле ввода + кнопки
      ReplyPreview.tsx        — показ цитаты над инпутом
      ReactionBar.tsx         — реакции под пузырём
      TypingIndicator.tsx     — "Иван печатает..."
  hooks/
    useRealtime.ts            — ЕДИНСТВЕННЫЙ хук для Realtime подписок
    usePresence.ts            — typing indicator через Presence
  lib/
    actions/
      messages.ts             — sendMessage, deleteMessage, markAsRead
      reactions.ts            — toggleReaction
```

---

## Ключевые паттерны с примерами кода

### MSG-01: Realtime подписка (useRealtime)

[VERIFIED: Context7 /supabase/supabase-js]

```typescript
// src/hooks/useRealtime.ts
'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/types/database.types'

type Message = Tables<'messages'>

interface UseRealtimeOptions {
  groupId: string
  onInsert: (msg: Message) => void
  onUpdate: (msg: Message) => void
  onDelete: (id: string) => void
}

export function useRealtime({ groupId, onInsert, onUpdate, onDelete }: UseRealtimeOptions) {
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    // Один канал — несколько событий
    const channel = supabase
      .channel(`group:${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (payload) => onInsert(payload.new as Message)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (payload) => onUpdate(payload.new as Message)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (payload) => onDelete((payload.old as { id: string }).id)
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId]) // ВАЖНО: groupId в deps, пересоздаём при смене группы
}
```

**Критический момент:** фильтр `filter: \`group_id=eq.${groupId}\`` требует, чтобы в Supabase Dashboard для таблицы `messages` была включена Realtime репликация (Publication). Проверить: Database → Replication → supabase_realtime publication → messages таблица должна быть включена. [VERIFIED: docs.supabase.com]

### MSG-02: Cursor-based пагинация

[ASSUMED — паттерн стандартный, но точный API Supabase проверен через Context7]

```typescript
// src/lib/actions/messages.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/lib/types/database.types'

const PAGE_SIZE = 50

export async function fetchMessages(
  groupId: string,
  cursor?: string // ISO timestamp последнего загруженного сообщения
): Promise<Tables<'messages'>[]> {
  const supabase = await createClient()

  let query = supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!sender_id(id, display_name, avatar_url),
      reply:messages!reply_to(id, content, sender:profiles!sender_id(display_name)),
      reactions:message_reactions(id, emoji, user_id),
      reads:message_reads(user_id)
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false }) // свежие первые
    .limit(PAGE_SIZE)

  if (cursor) {
    query = query.lt('created_at', cursor) // keyset: всё до курсора
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).reverse() // отображаем в хронологическом порядке
}
```

**Infinite scroll trigger (IntersectionObserver):**

```typescript
// В MessageList.tsx — наблюдаем за топовым элементом
const topRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting && hasMore && !loading) {
        loadMore() // вызывает fetchMessages с cursor = messages[0].created_at
      }
    },
    { threshold: 0.1 }
  )
  if (topRef.current) observer.observe(topRef.current)
  return () => observer.disconnect()
}, [hasMore, loading, loadMore])
```

**Сохранение позиции скролла при подгрузке:** перед вставкой новых сообщений сверху запомнить `scrollHeight`, после вставки установить `scrollTop = newScrollHeight - prevScrollHeight`.

### MSG-03: Reply (цитата)

Поле `reply_to UUID` уже есть в таблице `messages`. При запросе истории JOIN на родительское сообщение (см. select выше: `reply:messages!reply_to`).

```typescript
// ReplyPreview.tsx — показывается над MessageInput когда выбран reply
interface ReplyPreviewProps {
  replyTo: { id: string; content: string; senderName: string } | null
  onCancel: () => void
}
```

```typescript
// Server Action
export async function sendMessage(
  groupId: string,
  content: string,
  replyTo?: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('messages')
    .insert({ group_id: groupId, content, sender_id: user.id, reply_to: replyTo ?? null })

  if (error) throw error
}
```

### MSG-04 + MSG-05: Mark as read + статус ✓/✓✓

**Стратегия batch insert:**

```typescript
// src/lib/actions/messages.ts
export async function markMessagesAsRead(messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // INSERT OR IGNORE (upsert onConflict ignore)
  await supabase
    .from('message_reads')
    .upsert(
      messageIds.map((message_id) => ({ message_id, user_id: user.id })),
      { onConflict: 'message_id,user_id', ignoreDuplicates: true }
    )
}
```

Вызывать из `useEffect` в `ChatWindow` при монтировании и при получении новых сообщений (только чужие).

**Статус ✓/✓✓ в MessageBubble:**

Данные `reads` уже подтягиваются при fetchMessages (см. select выше). Логика:
- Нет записей в reads → ✓ (доставлено, никто не прочёл)
- Хотя бы один другой user есть в reads → ✓✓ (прочитано)

```typescript
// Внутри MessageBubble — только для своих сообщений
const isRead = message.reads.some((r) => r.user_id !== currentUserId)

return isRead
  ? <CheckCheck size={14} className="text-indigo-300" />
  : <Check size={14} className="text-gray-400" />
```

### MSG-06: Typing indicator (usePresence)

[VERIFIED: Context7 /supabase/supabase-js]

```typescript
// src/hooks/usePresence.ts
'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TypingUser {
  userId: string
  displayName: string
}

export function usePresence(groupId: string, currentUserId: string, currentUserName: string) {
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])

  useEffect(() => {
    const channel = supabase.channel(`typing:${groupId}`, {
      config: { presence: { key: currentUserId } },
    })

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ typing: boolean; displayName: string }>()
      const typing = Object.entries(state)
        .filter(([uid, presences]) => uid !== currentUserId && presences[0]?.typing)
        .map(([uid, presences]) => ({ userId: uid, displayName: presences[0].displayName }))
      setTypingUsers(typing)
    })

    channel.subscribe()
    channelRef.current = channel

    return () => { supabase.removeChannel(channel) }
  }, [groupId, currentUserId])

  const setTyping = async (typing: boolean) => {
    if (!channelRef.current) return
    if (typing) {
      await channelRef.current.track({ typing: true, displayName: currentUserName })
    } else {
      await channelRef.current.track({ typing: false, displayName: currentUserName })
    }
  }

  return { typingUsers, setTyping }
}
```

**Debounce в MessageInput:** вызывать `setTyping(true)` при onChange, `setTyping(false)` через 2000ms debounce после последнего нажатия.

**Отображение в TypingIndicator:**
```typescript
// "Иван печатает..." / "Иван и Мария печатают..."
const text = typingUsers.length === 1
  ? `${typingUsers[0].displayName} печатает...`
  : `${typingUsers.map(u => u.displayName).join(', ')} печатают...`
```

### MSG-07: Soft delete

```typescript
// Server Action
export async function deleteMessage(messageId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // RLS проверит что sender_id = auth.uid()
  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('sender_id', user.id) // дополнительная защита на клиенте

  if (error) throw error
}
```

Realtime UPDATE событие придёт через `useRealtime` → `onUpdate` обновит сообщение в local state. В `MessageBubble` показываем `"Сообщение удалено"` если `deleted_at !== null`.

### MSG-08: Реакции — toggle

**Важно:** в `database.types.ts` у `message_reactions` нет явного UNIQUE constraint на уровне типов, но предполагается что он есть в БД. [ASSUMED — нужно проверить миграцию фазы 1]

**Паттерн toggle (upsert + delete):**

```typescript
// src/lib/actions/reactions.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function toggleReaction(messageId: string, emoji: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Проверяем существующую реакцию
  const { data: existing } = await supabase
    .from('message_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .maybeSingle()

  if (existing) {
    await supabase.from('message_reactions').delete().eq('id', existing.id)
  } else {
    await supabase
      .from('message_reactions')
      .insert({ message_id: messageId, emoji, user_id: user.id })
  }
}
```

**Оптимистичное обновление реакций:** не ждать Realtime, сразу обновить локальный state в `ReactionBar`, затем Realtime INSERT/DELETE придёт и подтвердит.

---

## Don't Hand-Roll

| Проблема | Не строить | Использовать |
|----------|------------|--------------|
| WebSocket соединение | Кастомный WS клиент | Supabase Realtime channels |
| Управление присутствием | Кастомная таблица онлайн-пользователей | Supabase Presence (`channel.track()`) |
| Emoji picker | Кастомный компонент | 6-8 хардкодных эмодзи-кнопок (v1) |
| Infinite scroll | `scroll` event listener с debounce | `IntersectionObserver` |
| Дедупликация сообщений | Ручное сравнение | Set по `id` при слиянии Realtime + initial load |

---

## Common Pitfalls

### Pitfall 1: Дублирование сообщения при Realtime + initial load

**Что идёт не так:** первоначальная загрузка возвращает сообщения A, B, C. Realtime тоже присылает C (если отправка была во время загрузки).

**Как избежать:** при `onInsert` проверять `messages.some(m => m.id === newMsg.id)` перед добавлением в state.

### Pitfall 2: Утечка Realtime-каналов при смене группы

**Что идёт не так:** пользователь переходит из группы в группу, старые каналы не закрываются → несколько активных подписок.

**Как избежать:** cleanup в `useEffect` обязателен — `return () => { supabase.removeChannel(channel) }`. groupId в deps массиве.

### Pitfall 3: Realtime не работает без включённой репликации

**Что идёт не так:** `postgres_changes` не приходят, хотя код правильный.

**Как избежать:** В Supabase Dashboard → Database → Replication → таблица `messages` должна быть добавлена в publication `supabase_realtime`. Это делается миграцией:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
```
Проверить что это сделано в Phase 1 (DB-09).

### Pitfall 4: Скролл не прыгает вниз при новых сообщениях

**Что идёт не так:** `scrollIntoView` на последнем элементе вызывается до рендера нового сообщения.

**Как избежать:** использовать `useEffect` с `messages` в deps + `requestAnimationFrame`:
```typescript
useEffect(() => {
  requestAnimationFrame(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  })
}, [messages.length])
```
Но: автоскролл вниз только если пользователь уже был внизу (иначе прервём чтение истории).

### Pitfall 5: Typing indicator не сбрасывается при уходе из чата

**Что идёт не так:** пользователь переходит в другую группу, presence с `typing: true` остаётся.

**Как избежать:** в cleanup `usePresence` вызывать `channel.untrack()` перед `removeChannel`.

### Pitfall 6: Оптимистичная отправка — сообщение появляется дважды

**Что идёт не так:** при оптимистичном добавлении сообщения в state + реальный INSERT через Server Action → Realtime INSERT тоже приходит → дубль.

**Как избежать:** либо не делать оптимистичное обновление (просто ждать Realtime), либо использовать временный `tempId` и заменять на реальный при получении.

**Рекомендация для v1:** не делать оптимистичный UI для отправки — при ~100 пользователях задержка незаметна, Realtime приходит быстро.

---

## Дизайн — Telegram Dark Mode

### MessageBubble

```typescript
// Своё сообщение — правое, синее
<div className={cn(
  'max-w-[70%] px-3 py-2 rounded-2xl text-sm',
  isOwn
    ? 'bg-indigo-600 text-white self-end rounded-br-sm'
    : 'bg-[#1e2c3a] text-gray-100 self-start rounded-bl-sm'
)}>
  {/* Reply preview */}
  {message.reply && (
    <div className="border-l-2 border-indigo-300 pl-2 mb-1 text-xs text-indigo-200 opacity-80">
      <span className="font-medium">{message.reply.sender.display_name}</span>
      <p className="truncate">{message.reply.content}</p>
    </div>
  )}

  {/* Content */}
  {message.deleted_at
    ? <span className="italic text-gray-400">Сообщение удалено</span>
    : <span>{message.content}</span>
  }

  {/* Time + read status */}
  <div className="flex items-center justify-end gap-1 mt-0.5">
    <span className="font-mono text-[10px] opacity-60">
      {format(new Date(message.created_at), 'HH:mm')}
    </span>
    {isOwn && <ReadStatus reads={message.reads} currentUserId={currentUserId} />}
  </div>
</div>
```

### ReactionBar

```typescript
// Под пузырём — pill-кнопки с emoji + count
<div className="flex flex-wrap gap-1 mt-1">
  {grouped.map(({ emoji, count, reacted }) => (
    <button
      key={emoji}
      onClick={() => toggleReaction(message.id, emoji)}
      className={cn(
        'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors',
        reacted
          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
          : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
      )}
    >
      {emoji} {count}
    </button>
  ))}
</div>
```

### TypingIndicator

```typescript
// В шапке чата под названием или над инпутом
{typingUsers.length > 0 && (
  <div className="text-xs text-gray-400 italic px-4 py-1">
    {typingText} {/* "Иван печатает..." */}
    <span className="inline-flex gap-0.5 ml-1">
      {/* анимированные точки */}
      {[0,1,2].map(i => (
        <span key={i} className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  </div>
)}
```

---

## Assumptions Log

| # | Утверждение | Раздел | Риск если неверно |
|---|------------|--------|-------------------|
| A1 | UNIQUE constraint `(message_id, user_id, emoji)` есть в миграции Phase 1 | MSG-08 реакции | `toggleReaction` может создать дубли; нужно добавить constraint в миграцию |
| A2 | `ALTER PUBLICATION supabase_realtime ADD TABLE messages` выполнен в Phase 1 (DB-09) | MSG-01 Realtime | Realtime не будет работать вообще |
| A3 | Нет оптимистичного UI при отправке — ждём Realtime INSERT | MSG-01 | При медленном соединении ощущение лага; решается в v2 |

---

## Open Questions

1. **UNIQUE constraint на message_reactions**
   - Что знаем: в `database.types.ts` нет явного указания на UNIQUE
   - Что неясно: есть ли constraint в миграции или нужно добавить
   - Рекомендация: проверить `supabase/migrations/` файлы Phase 1; если нет — добавить миграцию

2. **message_reads при Realtime: нужна ли подписка на reads?**
   - Что знаем: статус ✓✓ показывается для своих сообщений
   - Что неясно: нужно ли Realtime подписываться на `message_reads` чтобы ✓✓ появлялся мгновенно
   - Рекомендация: да, добавить в useRealtime подписку на INSERT в message_reads с фильтром по message sender_id; но для v1 можно обойтись перезагрузкой reads при получении нового сообщения

3. **Realtime для реакций**
   - Что знаем: реакции хранятся в `message_reactions`
   - Что неясно: нужна ли Realtime подписка на эту таблицу
   - Рекомендация: да — добавить в тот же канал `group:${groupId}` подписку на INSERT/DELETE в message_reactions; но требует включения в publication

---

## Environment Availability

Step 2.6: SKIPPED (нет новых внешних зависимостей — Supabase уже подключён, все инструменты уже установлены в предыдущих фазах)

---

## Sources

### Primary (HIGH confidence)
- Context7 `/supabase/supabase-js` — postgres_changes subscribe, Presence track/untrack/presenceState API, channel setup
- `src/lib/types/database.types.ts` — точная схема таблиц messages, message_reads, message_reactions
- `CLAUDE.md` — проектные ограничения и архитектурные правила

### Secondary (MEDIUM confidence)
- docs.supabase.com (через Context7) — Realtime publication setup, filter синтаксис

### Tertiary (LOW confidence / ASSUMED)
- Паттерн keyset pagination с Supabase — стандартный, но не верифицирован через Context7 в этой сессии
- Поведение `onConflict: ignoreDuplicates` в Supabase JS v2 — предполагается по документации

---

## Metadata

**Уверенность:**
- Realtime API: HIGH — верифицировано Context7
- Presence API: HIGH — верифицировано Context7
- Pagination паттерн: MEDIUM — стандартный keyset, не верифицирован через официальные примеры
- Дизайн-паттерны: HIGH — соответствуют CLAUDE.md и design reference (Telegram Dark)

**Дата исследования:** 2026-04-15
**Действительно до:** 2026-05-15
