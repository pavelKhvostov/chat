# Phase 5: Attachments — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 05-attachments
**Areas discussed:** Тема дизайна, Панель вложений, Голосовой плеер, Видео-кружок

---

## Тема дизайна

| Option | Description | Selected |
|--------|-------------|----------|
| Светлая по макетам | #EEF2FF фон, #4A7BF5 акцент, рефакторинг всего UI | ✓ |
| Тёмная тема (текущая) | Оставить #0f0f1a + индиго | |
| Dual-theme toggle | CSS variables + Tailwind dark mode | |

**User's choice:** Светлая тема по предоставленным макетам

---

## Рефакторинг существующих компонентов

| Option | Description | Selected |
|--------|-------------|----------|
| Переделать всё сразу | В Phase 5 рефакторим MessageBubble, MessageList, MessageInput, ChatWindow, Sidebar | ✓ |
| Только новые компоненты | Старые не трогаем, визуальное несоответствие до отдельного рефакторинга | |

**User's choice:** Переделать всё сразу

---

## Акцентный цвет

| Option | Description | Selected |
|--------|-------------|----------|
| #4A7BF5 по макетам | Кастомный Tailwind цвет 'brand' | ✓ |
| Tailwind blue-500 | #3B82F6 стандартный | |
| Выбрать по ходу | Claude discretion | |

**User's choice:** #4A7BF5

---

## Панель вложений

| Option | Description | Selected |
|--------|-------------|----------|
| Popup-меню (+) | Одна иконка, popup с 4 пунктами | ✓ |
| Отдельные иконки | 4 иконки всегда видны слева от input | |

**User's choice:** Popup-меню

---

## Голосовые — UX записи

| Option | Description | Selected |
|--------|-------------|----------|
| Зажать и держать | Hold-to-record, отпустить = отправка | ✓ |
| Кнопка старт/стоп | Нажать = начало, нажать = стоп+отправка | |

**User's choice:** Hold-to-record

---

## Голосовые — визуализация

| Option | Description | Selected |
|--------|-------------|----------|
| Waveform визуализация | Штрихи амплитуды как в макетах | ✓ |
| Простой прогресс-бар | Линейный прогресс воспроизведения | |

**User's choice:** Waveform

---

## Видео-кружок — UX записи

| Option | Description | Selected |
|--------|-------------|----------|
| Зажать кнопку | Hold-to-record с кружком превью камеры | ✓ |
| Отдельный экран записи | Fullscreen модалка с кнопкой записи | |

**User's choice:** Hold-to-record

---

## Видео-кружок — отображение в чате

| Option | Description | Selected |
|--------|-------------|----------|
| Круглый превью + play | 160×160px круг, inline воспроизведение | ✓ |
| Fullscreen по клику | Миниатюра → модалка fullscreen | |

**User's choice:** Круглый превью + inline play

---

## Claude's Discretion

- Просмотр изображений: lightbox overlay (не обсуждалось, выбор Claude)
- Генерация waveform для уже загруженных голосовых: случайный паттерн или сохранять при записи

## Deferred Ideas

- Превью записи видео-кружка в реальном времени (технически сложно на мобиле)
- Waveform на основе реального аудиоанализа для существующих сообщений
