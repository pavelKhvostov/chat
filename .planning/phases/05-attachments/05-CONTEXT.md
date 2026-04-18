# Phase 5: Attachments — Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Пользователь отправляет фото (≤10MB), файлы (≤50MB), голосовые сообщения (WebM ≤5MB) и видео-кружки (MP4 ≤30MB, ≤60 сек). Все типы вложений отображаются в пузырях чата с соответствующим UI.

**В scope:** загрузка через `/api/upload`, отображение в MessageBubble, запись голоса/видео через MediaRecorder.
**Не в scope:** DM-вложения (Phase 6), поиск по вложениям (Phase 7).

</domain>

<decisions>
## Implementation Decisions

### Тема дизайна — КРИТИЧЕСКОЕ РЕШЕНИЕ
- **D-01:** Переходим на **светлую тему** начиная с Phase 5. Фон: `#EEF2FF`, акцентный цвет: `#4A7BF5`. Tailwind config обновляется с кастомным цветом `brand`.
- **D-02:** Рефакторинг **всех существующих компонентов** в этой же фазе: `MessageBubble`, `MessageList`, `MessageInput`, `ChatWindow`, `Sidebar`, страница login. Один PR — всё согласованное.
- **D-03:** Новые компоненты вложений сразу пишутся в светлой теме.
- **D-04:** Цветовая система: пузыри входящих — белые (`bg-white`), пузыри исходящих — `bg-[#4A7BF5] text-white`. Фон страницы `bg-[#EEF2FF]`, sidebar чуть темнее `bg-[#E3E8F8]`.

### Панель вложений
- **D-05:** В `MessageInput` слева от поля ввода — одна иконка `+` (или скрепка). По клику — **popup-меню** с 4 пунктами: 🖼 Фото, 📎 Файл, 🎤 Голос, ⬤ Видео-кружок.
- **D-06:** Голос и видео-кружок активируются через popup (не через отдельные кнопки всегда-видимые).

### Голосовые сообщения
- **D-07:** UX записи — **hold-to-record**: зажать кнопку 🎤 → запись идёт. Отпустить → стоп + автоотправка. Как в Telegram.
- **D-08:** Отображение в пузыре — **waveform-визуализация**: вертикальные штрихи разной высоты (амплитуда). Генерируется при записи (AudioAnalyser API) и сохраняется в metadata или генерируется паттерном для уже загруженных.
- **D-09:** Справа от waveform — длительность (формат `00:56`), слева — кнопка play/pause.

### Видео-кружки
- **D-10:** UX записи — **hold-to-record**: зажать иконку ⬤ в popup → открывается круглый оверлей с превью камеры, запись идёт. Отпустить → стоп + автоотправка.
- **D-11:** Отображение в чате — **круглый превью 160×160px** (`rounded-full overflow-hidden`). Поверх — полупрозрачная кнопка play. По клику — воспроизведение inline (не fullscreen, не модалка).
- **D-12:** Длительность показывается под кружком.

### Просмотр медиа
- **D-13 (Claude's Discretion):** Клик по изображению — **lightbox overlay** (fullscreen затемнение с кнопкой закрыть). Не новая вкладка.
- **D-14 (Claude's Discretion):** Файлы скачиваются по клику на карточку через signed URL (ATT-08).

### Загрузка
- **D-15:** Все файлы загружаются через Server Action или `/api/upload` route — **не напрямую с клиента** (требование CLAUDE.md). Signed URL генерируется сервером.
- **D-16:** Лимиты проверяются на сервере: фото ≤10MB, файлы ≤50MB, голос ≤5MB, видео ≤30MB. Превышение → toast с сообщением об ошибке.

### Мобильная адаптация
- **D-17:** Все новые компоненты — **mobile-first**. Touch-targets ≥ 44px. Hold-to-record работает через `touchstart`/`touchend` (не только `mousedown`/`mouseup`).
- **D-18:** Popup-меню вложений на мобиле — bottom sheet или positioned above input.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Attachments — ATT-01 through ATT-08 (все acceptance criteria)
- `.planning/ROADMAP.md` §Phase 5 — Success Criteria для фазы

### Existing code to modify
- `src/components/chat/MessageInput.tsx` — добавить панель вложений
- `src/components/chat/MessageBubble.tsx` — добавить рендеринг attachment типов
- `src/components/chat/MessageList.tsx` — без изменений логики, только тема
- `src/components/chat/ChatWindow.tsx` — тема
- `src/lib/actions/messages.ts` — добавить sendAttachment action

### Design reference
- Пользователь предоставил светлые макеты (апрель 2026): фон `#EEF2FF`, акцент `#4A7BF5`, белые пузыри, waveform для голосовых

### No external specs
- Нет ADR-файлов — решения полностью зафиксированы в decisions выше.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useRealtime.ts` — подписка на realtime уже есть, вложения придут через тот же канал
- `src/hooks/useTyping.ts` — паттерн для хуков, аналогично сделать `useMediaRecorder`
- `src/lib/actions/messages.ts` — добавить `sendAttachment` по аналогии с `sendMessage`
- `src/lib/types/database.types.ts` — таблица `message_attachments` уже есть (`path`, `file_name`, `file_size`, `type`)

### Established Patterns
- Server Actions для всех мутаций — загрузка файлов тоже через Server Action или `/api/upload`
- Tailwind utility classes — никаких CSS модулей
- `useRealtime` — единая точка подписки, не дублировать

### Integration Points
- `MessageInput` → новый проп/колбэк для отправки вложения
- `MessageBubble` → switch по `attachment.type` для рендеринга
- Supabase Storage bucket "attachments" (уже в схеме, DB-10)
- `/api/upload` route — нужно создать (пока отсутствует)

</code_context>

<specifics>
## Specific Ideas

- Светлая тема — точный референс: предоставленные пользователем макеты корпоративного мессенджера (апрель 2026)
- Waveform: штрихи генерируются через `AnalyserNode` Web Audio API при записи; для отображения сохранять массив амплитуд в metadata или генерировать визуальный паттерн
- Hold-to-record UX должен работать и на mobile touch (`touchstart`/`touchend`) и desktop mouse (`mousedown`/`mouseup`)
- Видео-кружок: `MediaRecorder` с `video/mp4` или `video/webm`, `border-radius: 50%` на `<video>` элементе

</specifics>

<deferred>
## Deferred Ideas

- Превью видео-кружка во время записи (кружок с живой камерой) — если не уложится по сложности, fallback на иконку записи
- Waveform для уже загруженных голосовых (нет данных амплитуды) — можно генерировать случайный паттерн или хранить при записи

</deferred>

---

*Phase: 05-attachments*
*Context gathered: 2026-04-18*
