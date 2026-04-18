# Phase 5: Attachments — Research

**Researched:** 2026-04-18
**Domain:** File upload, MediaRecorder API, Supabase Storage, светлая тема, React компоненты чата
**Confidence:** HIGH

---

## Summary

Фаза 5 — самая широкая по охвату в проекте: она объединяет четыре разных типа медиа (изображения, файлы, голос, видео-кружки), критическое переключение на светлую тему и рефакторинг всех существующих UI-компонентов. База данных (`message_attachments`, bucket "attachments") и RLS-политики уже полностью готовы в миграциях 00002, 00004, 00005 — ничего добавлять в БД не нужно.

Ключевое техническое ограничение: Next.js Server Actions имеют лимит тела запроса 1 МБ по умолчанию. Для загрузки файлов до 50 МБ **обязателен** паттерн `createSignedUploadUrl` (сервер) + `uploadToSignedUrl` (клиент через Supabase JS SDK). `/api/upload` route — вспомогательный эндпоинт для генерации подписанного URL, не для передачи байт файла. MediaRecorder API поддерживается во всех современных браузерах, но mimeType различается: Safari поддерживает только `video/mp4`, Chrome/Firefox предпочитают `video/webm`. Нужна проверка `MediaRecorder.isTypeSupported()` перед инициализацией.

**Основная рекомендация:** Использовать паттерн signed upload URL для всех типов файлов; хранить waveform как JSON-массив в поле `metadata` (добавить миграцию для колонки); MediaRecorder инициализировать с проверкой поддерживаемых форматов.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Переходим на **светлую тему** начиная с Phase 5. Фон: `#EEF2FF`, акцентный цвет: `#4A7BF5`. Tailwind config обновляется с кастомным цветом `brand`.
- **D-02:** Рефакторинг **всех существующих компонентов** в этой же фазе: `MessageBubble`, `MessageList`, `MessageInput`, `ChatWindow`, `Sidebar`, страница login. Один PR — всё согласованное.
- **D-03:** Новые компоненты вложений сразу пишутся в светлой теме.
- **D-04:** Цветовая система: пузыри входящих — белые (`bg-white`), пузыри исходящих — `bg-[#4A7BF5] text-white`. Фон страницы `bg-[#EEF2FF]`, sidebar чуть темнее `bg-[#E3E8F8]`.
- **D-05:** В `MessageInput` слева от поля ввода — одна иконка `+` (или скрепка). По клику — **popup-меню** с 4 пунктами: Фото, Файл, Голос, Видео-кружок.
- **D-06:** Голос и видео-кружок активируются через popup (не отдельные кнопки).
- **D-07:** Hold-to-record для голоса: зажать → запись, отпустить → стоп + автоотправка.
- **D-08:** Waveform-визуализация в пузыре голосового — вертикальные штрихи разной высоты.
- **D-09:** Рядом с waveform — длительность (`00:56`), кнопка play/pause.
- **D-10:** Hold-to-record для видео-кружка: зажать → открывается круглый оверлей с превью, отпустить → стоп + автоотправка.
- **D-11:** Видео-кружок в чате — круглый превью 160×160px. Воспроизведение inline.
- **D-12:** Длительность под кружком.
- **D-13 (Claude's Discretion):** Клик по изображению — lightbox overlay.
- **D-14 (Claude's Discretion):** Файлы скачиваются по клику через signed URL.
- **D-15:** Загрузка через Server Action или `/api/upload` route — не напрямую с клиента.
- **D-16:** Лимиты проверяются на сервере: фото ≤10MB, файлы ≤50MB, голос ≤5MB, видео ≤30MB. Превышение → toast.
- **D-17:** Mobile-first. Touch-targets ≥44px. `touchstart`/`touchend` для hold-to-record.
- **D-18:** Popup-меню на мобиле — bottom sheet или positioned above input.

### Claude's Discretion
- D-13: lightbox overlay для изображений
- D-14: signed URL для скачивания файлов

### Deferred Ideas (OUT OF SCOPE)
- Превью видео-кружка в реальном времени во время записи (fallback — иконка записи)
- Waveform для уже загруженных голосовых без данных амплитуды — можно генерировать случайный паттерн
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ATT-01 | Отправка изображений (JPEG, PNG, GIF, WebP, ≤10MB) | `/api/upload` route + `createSignedUploadUrl`, валидация MIME на сервере |
| ATT-02 | Отправка файлов (≤50MB, любой тип) | Signed upload URL паттерн (обходит 1MB Server Action лимит) |
| ATT-03 | Голосовые сообщения (WebM ≤5MB, запись через браузер) | `useMediaRecorder` хук, `MediaRecorder` API, `audio/webm` mimeType |
| ATT-04 | Видео-кружки (MP4 ≤30MB ≤60сек, запись через камеру) | `MediaRecorder` с `video/mp4` или `video/webm`, `getUserMedia({video: true, audio: true})` |
| ATT-05 | Превью изображений в чате, клик — полный просмотр | `<Image>` Next.js + lightbox overlay компонент |
| ATT-06 | Видео-кружки — круглые с воспроизведением | `<video>` + `rounded-full overflow-hidden`, 160×160px, inline play |
| ATT-07 | Файлы — карточка с именем и размером | `FileCard` компонент, форматирование байт |
| ATT-08 | Signed URLs для скачивания (не публичные) | `supabase.storage.from('attachments').createSignedUrl(path, 3600)` на сервере |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Запись голоса/видео | Browser/Client | — | `MediaRecorder` + `getUserMedia` — только клиентский API |
| Выбор файла для загрузки | Browser/Client | — | `<input type="file">` — DOM API |
| Генерация Signed Upload URL | API/Backend | — | Требует `SUPABASE_SERVICE_ROLE_KEY`, нельзя на клиенте |
| Загрузка файла в Storage | Browser/Client | — | После получения signed URL клиент загружает напрямую в Supabase Storage |
| Сохранение записи в БД (`message_attachments`) | API/Backend | — | Server Action `sendAttachment`, проверка лимитов и членства |
| Генерация Signed URL для просмотра/скачивания | API/Backend | — | Server-side, не выставлять в клиент |
| Waveform-визуализация | Browser/Client | — | `AnalyserNode` Web Audio API — только клиент |
| Рендеринг attachment в пузыре | Frontend (Client Component) | — | `MessageBubble` расширяется, switch по `type` |
| Валидация размера файла | API/Backend | Browser/Client | Сервер — главная проверка; клиент — UX-быстрая проверка |
| Lightbox overlay | Browser/Client | — | Клиентский компонент с состоянием `isOpen` |

---

## Standard Stack

### Core (уже установлено в проекте)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.103.3 [VERIFIED: npm] | Storage upload, signed URLs | Уже в проекте, Storage API встроен |
| `@supabase/ssr` | 0.10.2 [VERIFIED: npm] | Server-side Supabase клиент | Уже в проекте |
| `next` | 14.2.35 [VERIFIED: npm] | API route `/api/upload` | Уже в проекте |
| `lucide-react` | 1.8.0 [VERIFIED: npm] | Иконки (Paperclip, Mic, Video, Play, Pause, X) | Уже в проекте, соответствует дизайн-системе |

### Supporting (нужно добавить)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/image` | встроен в Next.js 14 | Оптимизация изображений в превью | ATT-05, превью в пузыре |

**Внешних библиотек добавлять не нужно.** Все возможности (MediaRecorder, Web Audio API, File API, signed URLs) доступны через браузер и уже установленный Supabase SDK.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `createSignedUploadUrl` + `uploadToSignedUrl` | Передача файла через Server Action | Server Action лимит 1MB — не подходит для файлов ≤50MB |
| `<video>` inline + `rounded-full` | react-player или video.js | Лишние зависимости, функционал элементарный |
| Собственный waveform через Canvas | wavesurfer.js | +200KB bundle, простые штрихи не требуют библиотеки |
| Нативный `<dialog>` для lightbox | react-modal | Нативный подход проще, нет зависимостей |

**Installation:** ничего дополнительно устанавливать не нужно.

---

## Architecture Patterns

### System Architecture Diagram

```
Пользователь выбирает файл / нажимает запись
       │
       ▼
[Browser] Валидация размера (быстрая UX-проверка)
       │ превышение → toast ошибка
       │ ОК ↓
       ▼
[Browser] MediaRecorder (для голоса/видео) или File input (для файла/фото)
       │ Blob / File готов
       ▼
[Browser → /api/upload (POST)]  ← Server Action НЕ используется для байт файла
  body: { fileName, fileSize, fileType, groupId }
       │
       ▼
[API Route /api/upload]
  1. Проверить auth (supabase.auth.getUser())
  2. Проверить членство в группе (is_group_member)
  3. Проверить размер файла по типу (D-16)
  4. supabase.storage.from('attachments').createSignedUploadUrl(path)
  5. Вернуть { signedUrl, token, path } клиенту
       │
       ▼
[Browser → Supabase Storage (прямая загрузка)]
  supabase.storage.from('attachments').uploadToSignedUrl(path, token, file)
       │
       ▼
[Browser → Server Action sendAttachment]
  sendAttachment({ groupId, path, fileName, fileSize, type, metadata })
  → INSERT INTO messages (content='', ...) → получить message_id
  → INSERT INTO message_attachments (message_id, path, type, file_name, file_size)
       │
       ▼
[Supabase Realtime] → useRealtime onInsert → MessageBubble рендерит вложение
       │
       ▼
[Просмотр/Скачивание]
  Клик → Server Action getAttachmentUrl(path)
       → supabase.storage.from('attachments').createSignedUrl(path, 3600)
       → Вернуть signedUrl клиенту
```

### Recommended Project Structure

```
src/
  app/
    api/
      upload/
        route.ts         # POST: генерация signed upload URL
  components/
    chat/
      MessageBubble.tsx  # + switch по attachment.type
      MessageInput.tsx   # + AttachmentPopup
      AttachmentPopup.tsx # popup-меню 4 пункта
      VoiceRecorder.tsx  # hold-to-record + waveform capture
      VideoCircleRecorder.tsx # hold-to-record + круглый оверлей
      ImageLightbox.tsx  # fullscreen overlay для изображений
      attachments/
        ImageAttachment.tsx      # превью + lightbox
        FileAttachment.tsx       # карточка файла
        VoiceAttachment.tsx      # waveform плеер
        VideoCircleAttachment.tsx # круглый видео-плеер
  hooks/
    useMediaRecorder.ts  # аналог useTyping — запись голоса и видео
  lib/
    actions/
      attachments.ts     # sendAttachment, getAttachmentUrl
```

### Pattern 1: Signed Upload URL Flow

**What:** Сервер генерирует одноразовый URL (TTL 2 часа), клиент загружает напрямую в Supabase Storage.

**When to use:** Для всех типов файлов — обход лимита Server Action в 1MB.

```typescript
// /api/upload/route.ts — Server (генерация URL)
// [CITED: supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl]
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { fileName, fileSize, fileType, groupId } = await req.json()

  // Валидация размера по типу
  const limits: Record<string, number> = {
    image: 10 * 1024 * 1024,
    voice: 5 * 1024 * 1024,
    video_circle: 30 * 1024 * 1024,
    file: 50 * 1024 * 1024,
  }
  if (fileSize > limits[fileType]) {
    return Response.json({ error: 'File too large' }, { status: 413 })
  }

  // Проверка членства в группе (is_group_member — SECURITY DEFINER функция)
  const { data: member } = await supabase.rpc('is_group_member', { p_group_id: groupId })
  if (!member) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const path = `${user.id}/${groupId}/${Date.now()}_${fileName}`
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUploadUrl(path)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ signedUrl: data.signedUrl, token: data.token, path })
}

// Клиент — загрузка через uploadToSignedUrl
// [CITED: supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl]
const supabase = createClient()
await supabase.storage
  .from('attachments')
  .uploadToSignedUrl(path, token, file)
```

### Pattern 2: useMediaRecorder Hook

**What:** Хук для голоса и видео, hold-to-record, waveform amplitude capture.

**When to use:** `VoiceRecorder`, `VideoCircleRecorder` компоненты.

```typescript
// src/hooks/useMediaRecorder.ts [ASSUMED — паттерн по аналогии с useTyping]
import { useRef, useCallback, useState } from 'react'

type MediaType = 'audio' | 'video'

export function useMediaRecorder(type: MediaType) {
  const [isRecording, setIsRecording] = useState(false)
  const [amplitudes, setAmplitudes] = useState<number[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)

  const getMimeType = (): string => {
    // Safari поддерживает только mp4/aac
    // [CITED: webkit.org/blog/11353/mediarecorder-api/]
    if (type === 'video') {
      if (MediaRecorder.isTypeSupported('video/mp4')) return 'video/mp4'
      return 'video/webm'
    }
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
    return 'audio/mp4'
  }

  const startRecording = useCallback(async () => {
    const constraints = type === 'audio'
      ? { audio: true }
      : { video: { width: 480, height: 480, facingMode: 'user' }, audio: true }

    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    chunksRef.current = []

    // Waveform capture через AnalyserNode
    // [CITED: developer.mozilla.org/docs/Web/API/AnalyserNode]
    if (type === 'audio') {
      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      const captureAmplitudes: number[] = []
      const capture = () => {
        analyser.getByteTimeDomainData(dataArray)
        const max = Math.max(...Array.from(dataArray).map(v => Math.abs(v - 128)))
        captureAmplitudes.push(max)
        if (captureAmplitudes.length % 10 === 0) {
          setAmplitudes([...captureAmplitudes])
        }
        animFrameRef.current = requestAnimationFrame(capture)
      }
      capture()
    }

    const mimeType = getMimeType()
    const mr = new MediaRecorder(stream, { mimeType })
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mediaRecorderRef.current = mr
    mr.start(100) // timeslice 100ms
    setIsRecording(true)
  }, [type])

  const stopRecording = useCallback((): Promise<{ blob: Blob; amplitudes: number[] }> => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current
      if (!mr) return

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType })
        const tracks = mr.stream.getTracks()
        tracks.forEach(t => t.stop())
        resolve({ blob, amplitudes })
        setIsRecording(false)
      }
      mr.stop()
    })
  }, [amplitudes])

  return { isRecording, amplitudes, startRecording, stopRecording }
}
```

### Pattern 3: sendAttachment Server Action

**What:** Создаёт сообщение с пустым content и записывает вложение в message_attachments.

```typescript
// src/lib/actions/attachments.ts [ASSUMED — паттерн по аналогии с sendMessage]
'use server'
import { createClient } from '@/lib/supabase/server'

interface AttachmentPayload {
  groupId: string
  path: string
  fileName: string
  fileSize: number
  type: 'image' | 'file' | 'voice' | 'video_circle'
  metadata?: { duration?: number; amplitudes?: number[] }
}

export async function sendAttachment(payload: AttachmentPayload): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Создать сообщение с пустым content
  const { data: msg, error: msgError } = await supabase
    .from('messages')
    .insert({
      group_id: payload.groupId,
      sender_id: user.id,
      content: '',
    })
    .select('id')
    .single()

  if (msgError || !msg) throw msgError ?? new Error('Failed to create message')

  const { error: attError } = await supabase
    .from('message_attachments')
    .insert({
      message_id: msg.id,
      path: payload.path,
      type: payload.type,
      file_name: payload.fileName,
      file_size: payload.fileSize,
    })

  if (attError) throw attError
}

export async function getAttachmentUrl(path: string): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(path, 3600) // 1 час
  if (error) throw error
  return data.signedUrl
}
```

### Pattern 4: MessageBubble — switch по attachment.type

**What:** Расширение `MessageWithRelations` для включения вложений, рендеринг по типу.

```typescript
// Расширение типа в messages.ts
export type MessageWithRelations = Tables<'messages'> & {
  sender: Pick<Tables<'profiles'>, 'id' | 'display_name' | 'avatar_url'>
  reply: (...) | null
  reactions: Pick<Tables<'message_reactions'>, 'id' | 'emoji' | 'user_id'>[]
  reads: Pick<Tables<'message_reads'>, 'user_id'>[]
  attachments: Pick<Tables<'message_attachments'>, 'id' | 'path' | 'type' | 'file_name' | 'file_size'>[]  // НОВОЕ
}

// В fetchMessages — добавить join:
// attachments:message_attachments(id, path, type, file_name, file_size)

// В MessageBubble — рендеринг вложения внутри пузыря
{message.attachments?.map((att) => {
  switch (att.type) {
    case 'image': return <ImageAttachment key={att.id} path={att.path} />
    case 'voice': return <VoiceAttachment key={att.id} path={att.path} fileName={att.file_name} />
    case 'video_circle': return <VideoCircleAttachment key={att.id} path={att.path} />
    case 'file': return <FileAttachment key={att.id} path={att.path} fileName={att.file_name} fileSize={att.file_size} />
  }
})}
```

### Pattern 5: Светлая тема — Tailwind config

**What:** Добавление кастомного цвета `brand` и замена тёмных классов.

```typescript
// tailwind.config.ts [ASSUMED — стандартный Tailwind паттерн]
const config: Config = {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4A7BF5',
          50: '#EEF2FF',
          100: '#E3E8F8',
          500: '#4A7BF5',
          600: '#3A6AE4',
        },
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
    },
  },
}
// Использование:
// bg-brand-50 → #EEF2FF (фон страниц)
// bg-brand-100 → #E3E8F8 (sidebar)
// bg-brand → #4A7BF5 (исходящие пузыри, кнопки)
```

### Anti-Patterns to Avoid

- **Передача File через Server Action:** Server Action лимит 1MB — для файлов всегда использовать signed upload URL через `/api/upload`.
- **Публичный Storage bucket:** Bucket "attachments" уже настроен как приватный в миграции 00005. Никогда не делать `public: true`.
- **Прямой `supabase.storage.upload()` с клиента без signed URL:** Требует сервисного ключа или открытых RLS — нарушение безопасности.
- **Дублирование Realtime-подписки:** Новые вложения приходят через существующий `useRealtime` канал `group:{groupId}` (INSERT на messages) — не добавлять отдельную подписку на `message_attachments`.
- **Хранение signedUrl в state без TTL:** Signed URL истекает через 1 час. Генерировать по требованию (клик), не кешировать на весь сеанс.
- **Инициализация MediaRecorder без isTypeSupported():** Safari не поддерживает `video/webm`. Всегда проверять перед использованием.
- **Смешивание тёмной и светлой темы:** D-02 требует рефакторинг ВСЕХ компонентов в одной фазе. Не оставлять тёмные классы в старых компонентах.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Подпись URL для приватного хранилища | Собственный JWT-подписчик | `supabase.storage.createSignedUrl()` | Встроено, использует Supabase Storage secret |
| Загрузка больших файлов через сервер | Проксирование через Next.js | `createSignedUploadUrl` + прямая загрузка клиентом | Обход 1MB Server Action лимита |
| Waveform-визуализация | wavesurfer.js (~200KB) | Native Web Audio API `AnalyserNode` | Нет зависимостей, 50 строк кода |
| Видео/аудио плеер | video.js, react-player | Нативный `<audio>`/`<video>` | Нет зависимостей, кастомный CSS |
| Lightbox | react-lightbox (~100KB) | Собственный `<dialog>` / `fixed inset-0` overlay | Простая задача, не нужна библиотека |
| Форматирование размера файла | Ручное форматирование | Одна утилита-функция `formatBytes(bytes)` | 10 строк, нет зависимости |

**Key insight:** Весь необходимый функционал покрывается браузерными API и уже установленным Supabase SDK. Никаких новых npm-зависимостей не требуется.

---

## Common Pitfalls

### Pitfall 1: Next.js Server Action — лимит 1MB
**What goes wrong:** `sendAttachment` с FormData содержащей файл выбрасывает `Body exceeded 1mb limit`.
**Why it happens:** Next.js 14 по умолчанию ограничивает тело Server Action в 1MB. [CITED: github.com/vercel/next.js/discussions/57973]
**How to avoid:** Никогда не передавать байты файла через Server Action. Паттерн: сначала получить signed URL через `/api/upload`, загрузить файл напрямую в Supabase Storage, затем вызвать Server Action только с metadata (path, size, type).
**Warning signs:** `413 Payload Too Large` или `Body exceeded 1mb limit` в консоли.

### Pitfall 2: mimeType несовместимость между браузерами
**What goes wrong:** `new MediaRecorder(stream, { mimeType: 'video/webm' })` бросает ошибку в Safari.
**Why it happens:** Safari поддерживает только `video/mp4` (H.264/AAC). [CITED: webkit.org/blog/11353/mediarecorder-api/]
**How to avoid:** Всегда проверять `MediaRecorder.isTypeSupported(mimeType)` перед инициализацией. Порядок проверки: `video/mp4` → `video/webm` для видео; `audio/webm` → `audio/mp4` для аудио.
**Warning signs:** `DOMException: Failed to construct 'MediaRecorder'` в Safari/iOS.

### Pitfall 3: `getUserMedia` требует HTTPS
**What goes wrong:** `navigator.mediaDevices.getUserMedia()` возвращает `undefined` или бросает ошибку.
**Why it happens:** В браузерах `getUserMedia` доступен только на HTTPS или localhost. [CITED: MDN Web Docs]
**How to avoid:** Локально разрабатывать через `localhost` (Next.js dev server), на проде — Vercel HTTPS. Проверять `navigator.mediaDevices` перед вызовом.
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'getUserMedia')`.

### Pitfall 4: Signed URL истекает — объект не отображается
**What goes wrong:** Изображения/файлы перестают загружаться через некоторое время.
**Why it happens:** `createSignedUrl` с TTL 3600 сек — URL истекает через 1 час. Если URL сохранён в компоненте при первом рендере, он протухает.
**How to avoid:** Генерировать signed URL по требованию (при клике) через Server Action `getAttachmentUrl`. Для превью изображений в пузыре — генерировать при маунте, принять что TTL 1 час покрывает нормальную сессию.
**Warning signs:** `403 Forbidden` от Supabase Storage через ~1 час после загрузки.

### Pitfall 5: `message_attachments` не включены в `MessageWithRelations`
**What goes wrong:** Вложения не отображаются, хотя сохраняются в БД.
**Why it happens:** В `fetchMessages` не добавлен join с `message_attachments`.
**How to avoid:** Обновить `fetchMessages` query: добавить `attachments:message_attachments(id, path, type, file_name, file_size)` в `.select()`. Обновить тип `MessageWithRelations`.
**Warning signs:** `message.attachments` равно `undefined` при рендере.

### Pitfall 6: Оптимистичный UI для вложений — сложнее чем для текста
**What goes wrong:** Вложения мигают или дублируются при Realtime обновлении.
**Why it happens:** Загрузка файла асинхронная, Realtime INSERT приходит после `sendAttachment`. Оптимистичный `temp-` ID трудно сопоставить с реальным.
**How to avoid:** Для вложений — не делать оптимистичный UI, показывать индикатор загрузки вместо него. После успешного `sendAttachment` — ждать Realtime `onInsert`. Это проще и менее рискованно.
**Warning signs:** Двойные сообщения в списке после отправки вложения.

### Pitfall 7: Waveform — амплитуды нужно сохранять до отправки
**What goes wrong:** Waveform не отображается у получателя.
**Why it happens:** `AnalyserNode` работает только во время записи. После отправки данных нет.
**How to avoid:** Сохранять массив амплитуд в metadata. Архитектурное решение: добавить колонку `metadata jsonb` в `message_attachments` через миграцию, либо хранить как отдельный small file в Storage. Рекомендуется: сохранить в metadata (проще, атомарно).
**Warning signs:** Waveform у получателя показывает случайный паттерн вместо реального.

---

## Code Examples

### Форматирование размера файла
```typescript
// src/lib/utils/formatBytes.ts
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}
```

### Hold-to-record — mouse + touch события
```typescript
// Оба события нужны: mouse для desktop, touch для mobile (D-17)
const handlePointerDown = () => startRecording()
const handlePointerUp = async () => {
  const { blob } = await stopRecording()
  await uploadAndSend(blob)
}

// JSX:
<button
  onMouseDown={handlePointerDown}
  onMouseUp={handlePointerUp}
  onTouchStart={(e) => { e.preventDefault(); handlePointerDown() }}
  onTouchEnd={(e) => { e.preventDefault(); handlePointerUp() }}
>
```

### Lightbox overlay
```typescript
// Простой lightbox без зависимостей [ASSUMED]
function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
      onClick={onClose}
    >
      <img src={src} className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
      <button className="absolute top-4 right-4 text-white/80 hover:text-white">
        <X size={24} />
      </button>
    </div>
  )
}
```

### Waveform рендеринг
```typescript
// 40 вертикальных штрихов, нормализованные амплитуды [ASSUMED]
function Waveform({ amplitudes }: { amplitudes: number[] }) {
  const bars = 40
  const sampled = amplitudes.length > bars
    ? Array.from({ length: bars }, (_, i) => amplitudes[Math.floor(i * amplitudes.length / bars)])
    : amplitudes.length > 0 ? amplitudes : Array(bars).fill(8)

  const max = Math.max(...sampled, 1)
  return (
    <div className="flex items-center gap-[2px] h-8">
      {sampled.map((amp, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-brand/70 flex-shrink-0"
          style={{ height: `${Math.max(4, (amp / max) * 32)}px` }}
        />
      ))}
    </div>
  )
}
```

---

## DB Schema Observations

**Что уже готово (не нужно добавлять):**
- Таблица `message_attachments` — поля `id`, `message_id`, `path`, `type`, `file_name`, `file_size`, `created_at` [VERIFIED: codebase]
- Constraint: `type IN ('image', 'file', 'voice', 'video_circle')` [VERIFIED: migration 00002]
- RLS политики `message_attachments_select` и `message_attachments_insert` [VERIFIED: migration 00004]
- Storage bucket "attachments" (приватный) + RLS для storage.objects [VERIFIED: migration 00005]
- Путь загрузки enforced: `(storage.foldername(name))[1] = auth.uid()::text` [VERIFIED: migration 00005]

**Что нужно добавить (новая миграция):**
- Колонка `metadata jsonb DEFAULT NULL` в `message_attachments` — для хранения `{ duration: number, amplitudes: number[] }` у голосовых/видео сообщений. Это нужно для waveform у получателя (D-08).

```sql
-- 00007_attachments_metadata.sql
ALTER TABLE message_attachments ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;
ALTER TABLE direct_message_attachments ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js dev/build | ✓ | n/a | — |
| `@supabase/supabase-js` | Storage upload, signed URLs | ✓ | 2.103.3 | — |
| Supabase Storage | Bucket "attachments" | Нужна проверка в prod [ASSUMED] | — | — |
| MediaRecorder API | ATT-03, ATT-04 | ✓ современные браузеры | Все браузеры | Кнопка disabled если не поддерживается |
| `getUserMedia` | ATT-03, ATT-04 | Только HTTPS/localhost | — | Показать ошибку-подсказку |
| Web Audio API | D-08 waveform | ✓ все браузеры | — | Паттерн из случайных значений |
| `MediaRecorder.isTypeSupported` | Кросс-браузерный mimeType | ✓ везде где MediaRecorder | — | — |

**Ограничение:** `/api/upload` route не существует — нужно создать (Wave 1 задача).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Нет — тестовый фреймворк не установлен в проекте |
| Config file | Отсутствует |
| Quick run command | `npm run lint` (единственная автоматизированная проверка) |
| Full suite command | `npm run build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ATT-01 | Изображение отправляется, появляется в чате | manual | — | — |
| ATT-02 | Файл ≤50MB загружается и скачивается | manual | — | — |
| ATT-03 | Голосовое записывается и воспроизводится | manual | — | — |
| ATT-04 | Видео-кружок записывается, отображается круглым | manual | — | — |
| ATT-05 | Клик по изображению — lightbox открывается | manual | — | — |
| ATT-06 | Видео-кружок воспроизводится inline | manual | — | — |
| ATT-07 | Файл-карточка с именем и размером | manual | — | — |
| ATT-08 | Файл скачивается через signed URL (не публичный) | manual + lint | `npm run lint` + `npm run build` | — |
| D-16 | Файл >лимита отклоняется с toast | manual | — | — |

**Примечание:** В проекте нет тестового фреймворка (ни jest, ни vitest, ни playwright). Все проверки — ручные E2E или через `npm run build` для проверки типов TypeScript.

### Wave 0 Gaps
- Нет тестового фреймворка — принять как есть согласно текущему состоянию проекта
- TypeScript-компиляция (`npm run build`) служит формальной проверкой типов

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth — `getUser()` в API route и Server Action |
| V3 Session Management | нет (Supabase handles) | — |
| V4 Access Control | yes | `is_group_member()` RLS-функция + проверка на сервере перед выдачей signed URL |
| V5 Input Validation | yes | Проверка `fileSize`, `fileType`, `MIME type` на сервере в `/api/upload` |
| V6 Cryptography | нет | Signed URLs генерирует Supabase Storage — не hand-roll |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Upload в чужую группу | Tampering | Проверка `is_group_member(groupId)` в `/api/upload` перед `createSignedUploadUrl` |
| Path traversal в `path` параметре | Tampering | Формировать путь на сервере: `${user.id}/${groupId}/${Date.now()}_${fileName}`, не принимать path от клиента |
| Превышение лимита размера файла | DoS | Проверка `fileSize` в `/api/upload` до генерации URL; Storage RLS дополнительно |
| Доступ к чужим файлам через угаданный path | Information Disclosure | Bucket приватный + RLS на storage.objects: `(storage.foldername(name))[1] = auth.uid()::text` — только владелец загружает; SELECT разрешён всем auth пользователям через первую политику |
| XSS через имя файла | XSS | Отображать `file_name` через React (автоэкранирование), не через `dangerouslySetInnerHTML` |
| Загрузка исполняемых файлов | Tampering | ATT-02 разрешает "любой тип" — не выполнять файлы на сервере, только хранить и отдавать |

**Важное наблюдение по Storage RLS:** Политика `storage_attachments_select` разрешает чтение ЛЮБОМУ аутентифицированному пользователю (`auth.uid() IS NOT NULL`). Это означает, что пользователь за пределами группы может получить файл по прямому URL. Защита — через signed URL (необходимо знать path), а path строится как `{user_id}/{group_id}/{timestamp}_{name}` и не раскрывается публично. Приемлемо для корпоративного мессенджера ~100 пользователей. [VERIFIED: migration 00005]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Загрузка файла через Server Action FormData | Signed Upload URL → прямая загрузка в Storage | Next.js 14 (2024) | Нужен `/api/upload` route, не Server Action |
| `MediaRecorder` только Chrome/Firefox | Поддержка Safari с WebKit 14.5 (2021) | 2021 | Нужна проверка mimeType, не просто использовать webm |
| Публичные Storage buckets | Приватные buckets + signed URLs | — | Signed URL генерируется на сервере, TTL 1 час |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Waveform сохранять в `metadata jsonb` колонке | DB Schema / Pattern 2 | Нужно другое место хранения (отдельный файл или другая таблица) |
| A2 | `useMediaRecorder` структура хука | Pattern 2 | Может потребоваться другой API хука в зависимости от UX рекордера |
| A3 | `/api/upload` достаточно как Route Handler (не edge function) | Pattern 1 | Если нужен edge — Route Handler тоже работает, просто другой runtime |
| A4 | Один message → один attachment (не multi-attach) | Pattern 3 | Если нужно несколько файлов в одном сообщении — потребуется иная логика |
| A5 | Supabase Storage bucket "attachments" доступен в prod окружении | Environment | DB-10 требует настройки в продакшн Supabase проекте |
| A6 | Tailwind `brand` цвет достаточен для всей светлой темы | Pattern 5 | Могут потребоваться дополнительные semantic-токены |

---

## Open Questions

1. **Metadata для waveform — где хранить?**
   - Что знаем: `message_attachments` не имеет `metadata` колонки
   - Неясно: принято ли решение добавить колонку или использовать другой подход
   - Рекомендация: Добавить `metadata jsonb` через миграцию 00007 — атомарно и просто

2. **Multi-attachment в одном сообщении**
   - Что знаем: Схема поддерживает несколько `message_attachments` на одно `message_id`
   - Неясно: Контекст предполагает одно вложение на сообщение (как в Telegram)
   - Рекомендация: Реализовывать как one-to-one, расширить позже если нужно

3. **Оптимистичный UI для вложений**
   - Что знаем: Для текста используется `temp-` ID оптимизм
   - Неясно: Стоит ли делать optimistic для вложений (сложно из-за асинхронной загрузки)
   - Рекомендация: Не делать оптимистичный UI, показывать прогресс-индикатор загрузки

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase] — `src/lib/types/database.types.ts`, миграции 00002/00004/00005, существующие компоненты
- [CITED: supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl] — createSignedUploadUrl API
- [CITED: supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl] — uploadToSignedUrl API
- [CITED: developer.mozilla.org/docs/Web/API/AnalyserNode] — Web Audio API AnalyserNode
- [CITED: developer.mozilla.org/docs/Web/API/MediaStream_Recording_API] — MediaRecorder API

### Secondary (MEDIUM confidence)
- [CITED: github.com/vercel/next.js/discussions/57973] — Server Action 1MB body limit
- [CITED: webkit.org/blog/11353/mediarecorder-api/] — Safari MediaRecorder поддержка MP4/H.264/AAC

### Tertiary (LOW confidence)
- WebSearch results о browser compatibility MediaRecorder 2025

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — все библиотеки уже в проекте, версии верифицированы через npm
- Architecture: HIGH — схема БД верифицирована по codebase, upload паттерн по официальным docs
- Pitfalls: HIGH — 1MB лимит верифицирован по GitHub discussions, mimeType по WebKit blog
- Waveform metadata storage: MEDIUM — паттерн логичный, но конкретная реализация ASSUMED

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (стабильные технологии, 30 дней)
