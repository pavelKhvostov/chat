# Handoff: VkusnoChat — Design System v1.0

## Overview

VkusnoChat — корпоративный (B2B) мессенджер для команд: чаты (личные, групповые, каналы), голосовые сообщения, аудио/видеозвонки, задачи и заметки. Этот пакет содержит **дизайн-систему** (токены + компоненты + экраны-примеры) на одном HTML-полотне, которую нужно перенести в реальный кодовый стек.

## About the Design Files

Файлы в этом пакете — **HTML-референс дизайна**, а не production-код для копирования как есть. Это прототип, демонстрирующий целевой визуальный язык, палитру, типографику, пропорции и поведение компонентов.

Задача разработчика: **воссоздать этот дизайн в целевой кодовой базе** (React / Vue / SwiftUI / Flutter / etc.), используя её существующие соглашения, библиотеки и паттерны. Если проект новый — выбрать подходящий фреймворк и реализовать систему там. HTML показывает, **как должно выглядеть и ощущаться**, а не **как должно быть написано**.

## Fidelity

**High-fidelity (hifi)** — финальные цвета, типографика, spacing, состояния. Все значения в README являются источником истины: токены нужно переносить 1:1, пропорции и отступы — сохранять пиксель-в-пиксель.

---

## Design Tokens

Все токены уже объявлены в `<:root>` в `design-system.html`. Рекомендуется вынести их в `tokens.css` / `theme.ts` / `tailwind.config.js` — имена ниже являются каноничными.

### Colors — Brand

| Token | Hex | Usage |
|---|---|---|
| `--coral-50`  | `#FFF3ED` | subtle coral tint backgrounds |
| `--coral-100` | `#FFE4D9` | badge bg, calendar today |
| `--coral-400` | `#FF8A65` | hover tint |
| `--coral-500` | `#FF6A3D` | **PRIMARY ACCENT** — buttons, links, active tabs |
| `--coral-600` | `#F2521F` | primary button hover |

### Colors — Navy (supporting, dark surfaces)

| Token | Hex |
|---|---|
| `--navy-500` | `#2E3E63` |
| `--navy-700` | `#1B2742` |
| `--navy-800` | `#111A2E` |
| `--navy-900` | `#0B1220` |

### Colors — Ink (cool neutrals)

| Token | Hex | Usage |
|---|---|---|
| `--ink-900` | `#0E1320` | primary text (light theme) |
| `--ink-700` | `#2A3145` | secondary text |
| `--ink-500` | `#5B6478` | tertiary text, icons |
| `--ink-400` | `#8891A5` | placeholder, muted |
| `--ink-300` | `#B8C0D0` | disabled |
| `--ink-200` | `#D9DEEA` | toggle off track |
| `--ink-100` | `#E8ECF5` | chip bg, bubble incoming |
| `--ink-50`  | `#F2F4FB` | row hover |

### Colors — Surfaces

| Token | Hex | Usage |
|---|---|---|
| `--bg`        | `#EEF2FB` | page background (light) |
| `--surface`   | `#FFFFFF` | card / panel |
| `--surface-2` | `#F7F9FE` | subtle panel |
| `--stroke`    | `#E1E6F2` | hairline border |
| `--stroke-2`  | `#CCD3E5` | input border |

### Colors — Semantic

| Token | Hex |
|---|---|
| `--success` | `#2EAE74` |
| `--warning` | `#E8A83C` |
| `--danger`  | `#E04E4E` |
| `--info`    | `#3E74E8` |

### Colors — Dark theme

| Role | Value |
|---|---|
| page bg | `#0B0F1C` |
| surface (cards) | `#0B1220` / `#111A2E` |
| elevated | `rgba(255,255,255,.04–.06)` |
| primary text | `#E6EAF5` |
| secondary text | `#8891A5` |
| stroke | `rgba(255,255,255,.06)` |
| accent | `#FF6A3D` (без изменений) |

### Radii

| Token | Value | Usage |
|---|---|---|
| `--r-xs`   | `4px`    | tags, small chips |
| `--r-sm`   | `6px`    | **base** — buttons, inputs |
| `--r-md`   | `8px`    | cards |
| `--r-lg`   | `12px`   | sheets, modals |
| `--r-pill` | `999px`  | pills, chips |

### Shadows

| Token | Value | Usage |
|---|---|---|
| `--sh-1` | `0 1px 2px rgba(14,19,32,.06), 0 1px 1px rgba(14,19,32,.04)` | inputs |
| `--sh-2` | `0 6px 18px rgba(14,19,32,.08), 0 2px 4px rgba(14,19,32,.04)` | popover, menu |
| `--sh-3` | `0 24px 60px rgba(14,19,32,.12), 0 8px 20px rgba(14,19,32,.06)` | modal, device |
| focus ring | `0 0 0 3px rgba(255,106,61,.14)` | input:focus |
| accent glow | `0 2px 6px rgba(242,82,31,.35)` | primary button |

### Spacing

Scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64` px. Variables `--s-1 … --s-16`.

### Typography

- **Primary**: `Manrope` (Google Fonts) — weights **400, 500, 600, 700, 800**
- **Mono**: `JetBrains Mono` — weights **400, 500, 600**
- feature settings: `"ss01", "cv11"` on body; `"tnum"` on numeric displays

| Token | Size | Weight | L-height | L-spacing | Notes |
|---|---|---|---|---|---|
| Display | 56px | 800 | 1.0  | -0.03em | marketing hero |
| H1      | 40px | 700 | 1.1  | -0.02em | page title |
| H2      | 28px | 700 | 1.2  | -0.015em | section |
| H3      | 20px | 600 | 1.3  | -0.01em | card title |
| Body    | 15px | 500 | 1.5  | 0 | default paragraph |
| Small   | 13px | 500 | 1.45 | 0 | meta, hints |
| Micro   | 11px | 600 | — | +0.06em | UPPERCASE eyebrow |
| Mono    | 13px | 500 | — | 0 | timestamps, IDs |

---

## Components

Each component lives in `design-system.html` under section **04 · Компоненты**. Расположение и параметры ниже.

### Button (`.btn`)

Base: `font-weight: 600`, `font-size: 14px`, `radius: 6px`, `padding: 10px 18px`, `gap: 8px`.

Variants:
- **primary** — bg `--coral-500`, text `#fff`, inner hairline `rgba(255,255,255,.18)`, glow `0 2px 6px rgba(242,82,31,.35)`; hover → `--coral-600`
- **secondary** — bg `--surface-2`, text `--ink-900`, border `--stroke-2`
- **ghost** — transparent, text `--ink-700`; hover bg `--ink-50`
- **danger** — bg `--danger`, text `#fff`

Sizes: `sm` (7×12, 13px), default (10×18, 14px), `lg` (14×22, 15px).
Modifiers: `btn-icon` (40×40 square), `btn-pill` (999px).
States: `:active` translate-Y 1px; `[disabled]` opacity .45.

### Input (`.input` / `.textarea`)

- `padding: 11px 14px`, radius 6, border `1px solid --stroke-2`, bg `--surface`, text 14px
- `::placeholder` → `--ink-400`
- `:focus` → border `--coral-500` + focus ring `0 0 0 3px rgba(255,106,61,.14)`
- `.error` → border `--danger` + red focus ring
- Icon-left: абсолютный icon, padding-left 38px

Field anatomy: label 12px 600 `--ink-500` → input → hint 12px `--ink-500` (или err 12px `--danger`).

### Toggle (`.tgl`)

44×26 pill, thumb 20×20 with `--sh-1`. Off bg `--ink-200`; on bg `--coral-500`; translate 18px.

### Checkbox (`.chk`)

18×18, radius 4, 1.5px border `--stroke-2`. On state: filled `--coral-500`, white check (stroke-width 3).

### Radio (`.rad`)

18×18 circle, 1.5px border. On: inner 8×8 coral dot, border coral.

### Badge (`.badge`)

11px 700 uppercase mono, padding `4×8`, radius 4. Tone pairs:
- coral `#FFE4D9 / #F2521F`
- info `#DDE7FD / #1F4FBD`
- success `#D4F1E2 / #1E7B4E`
- warn `#FBEBCC / #9A6E18`
- danger `#F9D9D9 / #A32D2D`
- ink `--ink-100 / --ink-700`

Modifier `.dot` — leading 6px dot in currentColor.

### Count / counter (`.count`)

Min-width 20, height 20, radius 10, bg `--coral-500`, 11px 700 white, `tnum`.

### Avatar (`.av`)

Circle. Sizes: sm 28, default 36, lg 48, xl 64. Font: 13/16/22 px, weight 700, white text.
Background — diagonal gradient 135° из shade-500 → shade-700 соответствующего цветового семейства (coral / blue / green / violet / amber / slate).
Presence dot `.dot` 10×10, 2px white border, bottom-right. `.on` = `--success`, `.off` = `--ink-400`.
Group: `.av-group` с overlap `-10px` и 2px white ring.

### Tabs (`.tabs`)

Pill-container `--ink-50`, padding 4, radius 999. Tab 7×14, 13px 600. Active: bg `--surface`, shadow `--sh-1`, text `--ink-900`.

### Menu (`.menu`)

Card: `--surface`, border `--stroke`, radius 8, shadow `--sh-2`, padding 6, min-width 220.
Item: 8×10, radius 4, 14px. Hover bg `--ink-50`. `.danger` text `--danger`. Keyboard hint: mono 11px `--ink-400` right-aligned. Separator 1px `--stroke`.

### Chat row (list item)

Grid `auto 1fr auto`, gap 14, padding 14×0, bottom border `--stroke`.
- left: avatar 36 (with presence dot)
- middle: title 15/600 + subtitle 13 `--ink-500` (truncate with ellipsis)
- right: timestamp (mono 11 `--ink-400`) + count badge

### Message bubble

- incoming: bg `--ink-50`, text `--ink-900`, padding 10×14, radius 8
- outgoing (`.me`): bg `--coral-500`, text white
- `who` (author): 12/700 `--coral-600` above text
- `time` (meta): 10px, opacity .75 / `--ink-400`
- max-width 75%, align self accordingly, gap-sm avatar on incoming

Voice bubble: play button (32×32 coral icon-btn) + waveform + duration mono.
Waveform: inline-flex of 2px bars (heights 25–90%), color `--coral-500` (light) / `#fff` (outgoing).

Typing indicator: 3 dots 6×6, `--ink-400`, animation `typ` 1.2s with staggered 0/.15/.3s delays.

### Day separator

Self-center pill, 11px mono uppercase, padding 3×10, radius 999, bg `rgba(255,255,255,.6)`.

### Calendar / DayPicker

Card 340px, padding 18, radius 8.
- header: month name 15/700 + prev/next chevrons
- grid: 7 cols, gap 4, text-center
- dow labels: 10px mono uppercase `--ink-400`
- day cell: 6×0 padding, 13/500, radius 4, `tnum`
- states: `.muted` (prev/next month) `--ink-300`; `.today` bg `--coral-100` text `--coral-600` 700; `.sel` bg `--coral-500` text `#fff` 700; `.dot` — 4×4 coral dot under number

### Task card

Card `--surface`, radius 8, border `--stroke`, padding 18.
- title 15/700
- description 13 `--ink-500`
- attachments row: 80×80 thumbnails, radius 6, label mono 9px bottom-left
- meta grid `100px 1fr`, separators via `border-top --stroke`
- actions: secondary buttons row + full-width primary `btn-lg`

### Status/presence dot

Standalone: 8×8 circle with 0 0 0 3px color/.2 halo; used in call recording indicator.

---

## Screens (showcase templates)

Each phone is 300px wide with 40px outer radius, 10px bezel, 32px inner screen radius, aspect 9/19.5.

### 1. iOS Chat List (light)

- Status bar 9:41 + signal icons, 14/24 padding
- Header: "Чаты" 22/800, -0.02em + search/new-chat icons
- Tabs pills: Все / Личные / Группы / Каналы (Coral active pill)
- Rounded search input (white 70% tint, stroke)
- Chat rows — see spec above, 6 rows
- Bottom tab bar: Чаты / Звонки / Люди / Задачи / Профиль (active = coral)

### 2. iOS Conversation (light)

- Convo header: avatar + name 14/700 + "28 участников · онлайн" (`--success` 11px) + call/video icons
- Body bg `--surface-2`; incoming bubble white+stroke; outgoing coral
- Day separator pill
- Composer: plus-icon ghost + grey "Сообщение" pill with emoji icon + round coral mic button 36×36

### 3. Desktop Chat (3-column)

Columns: **60px nav rail** | **flex main** | **280px participants**.
- Nav rail: logo 32×32, 38×38 icon buttons (coral-active / ghost)
- Main: top bar with avatar+title+actions (Звонок secondary, kebab ghost) → message area bg `--surface-2` → composer with primary "Отправить"
- Right panel `--surface-2`: eyebrow "Участники · 28" → rows (avatar-sm + name + role) → "Показать всех 28" ghost btn

### 4. Calls — ringing (mobile)

9:16 card 240px, bg `linear-gradient(180deg,#1B2742,#0B1220)`, radius 28, padding 22.
- top: brand label + timer (mono, opacity .8)
- center: 120×120 coral avatar with 2 halos (4px + 10px rgba coral)
- name 18/700, status 12 muted
- actions row: 4× 52px round buttons `rgba(255,255,255,.1)` → last is `.end` (`--danger`)

### 5. Calls — incoming group

Same frame, bg blue gradient `#3E74E8 → #2541A8`. Overlapping xl avatars (-20px). Decline/Accept: 60×60 circles (`--danger` / `--success`).

### 6. Calls — active desktop

400px card, bg `#0B0F1C`, radius 16, padding 24.
- top: REC dot (8×8 `--danger` with halo) + timer mono + people/fullscreen icons
- 2 video tiles, gradient placeholders, name+mic-indicator bottom
- action row: 4 round buttons (camera/mic/speaker) + `.end`

### 7. Tasks — task card (web)

Card 18px padding, radius 8.
- title 15/700 + coral badge top-right
- desc 13 muted
- attachments: 4× 80px thumbs (last = `+4` ink-100 chip)
- meta grid rows: Приоритет / Сроки / Исполнители / Автор
- 2 secondary buttons (Поделиться / Редактировать) + primary lg (Отметить как выполненную)

### 8. Tasks — calendar + deadlines

Stacked: calendar card above + "Сроки" card below (toggle row "Весь день" / Начало / Окончание pill coral).

### 9. Dark — Home / Tasks (phone)

`.phone.dark` → `--bg` becomes `#0B0F1C`, text `#E6EAF5`.
- Project header card with coral 32×32 icon (round number 21), chevron down
- Task rows: 16×16 circle indicator (outline or filled coral w/ check); title 12/600 white (strikethrough muted when done); timestamp mono 10 muted
- FAB bottom-right: 48×48 coral round + plus icon

### 10. Dark — Chat with keyboard

- Convo header on navy translucent
- Outgoing bubbles: coral with white waveform / file attachments (40×40 thumb + name + size)
- Composer with coral +-button and placeholder pill
- Mock keyboard: rows of 28×28 keys, bg `rgba(255,255,255,.1)`, shift/backspace 80px wide, "Go" key coral

### 11. Dark — Web tasks

2-column: 60px rail (`#070A14`, coral-active button) + main 20×24 padding. Same task-row pattern as mobile.

### 12. Logo mark

28×28 square, coral bg, radius 6. Inside: white 2px inset rounded rect. Speech-tail clip-path 8×8 triangle bottom-left.

Shown on four backgrounds: surface, coral (inverted white), navy-900, bg-tint (large 56×56 version).

---

## Interactions & Behavior

- **Button press**: `translate-y: 1px` on `:active` (60ms). Primary has subtle glow shadow.
- **Input focus**: 3px coral ring appears (150ms). Error state swaps color to `--danger`.
- **Toggle**: thumb translates 18px (200ms ease).
- **Typing indicator**: dots bounce -3px with 150ms stagger (1.2s infinite).
- **Tab switch**: active pill slides via inner white card + `--sh-1`.
- **Chat row hover**: optional `--ink-50` background.
- **Message send**: выходящий пузырь fades-in from right (not implemented in HTML, recommended).
- **Call answer/decline**: dedicated `.end` / `.ans` buttons; no modal — direct call-screen transition.
- **Calendar day**: click sets `.sel` state, updates selection elsewhere.
- **Menu**: opens with `--sh-2`, dismiss on outside-click.

---

## State Management (suggested)

- `auth` — user, session, SSO state
- `chats` — list (id, type, name, unread, lastMessage, updatedAt, members, pinned)
- `activeChat` — messages, participants, typing, composer draft
- `presence` — per-user online/offline, last-seen
- `calls` — current call (ringing / active / ended), roster, mute/camera/speaker flags
- `tasks` — list, filter (assignee/status), task detail (attachments, checklist)
- `calendar` — selected date, events on day
- `theme` — light / dark (persist via localStorage, toggle with `[data-theme="dark"]` on root)
- `notifications` — unread counts per tab, toast queue

---

## Assets

- **Fonts**: Manrope + JetBrains Mono via Google Fonts — CSS link уже в `design-system.html`
- **Icons**: все inline SVG (stroke 1.75, currentColor). Рекомендуется заменить на единый icon-set (Lucide / Phosphor / tabler). Соответствия по названиям: send, mic, phone, video, search, plus, chevron-left/right, check, trash, users, calendar, message-square, more-horizontal, reply, bookmark, share, pin, smile.
- **Images/avatars**: в прототипе — цветные градиентные плейсхолдеры с инициалами (на продакшне — реальные аватары пользователей, fallback на инициалы).
- **Logo**: самодельный SVG-лайк, собран из CSS (square + speech-tail). На продакшне лучше собрать финальный SVG-файл `logo.svg` + `logo-mark.svg` (с inverted вариантом).

---

## Files

- `design-system.html` — основной файл-прототип. Все компоненты, токены и экраны в одном месте. Источник истины для пиксель-перфекта.
- `README.md` — этот документ.

---

## Recommended Implementation Order

1. **Tokens** — `tokens.css` или эквивалент, импорт в корень. Подключить шрифты.
2. **Atoms** — Button, Input, Toggle, Checkbox, Radio, Badge, Count, Avatar.
3. **Molecules** — ChatRow, MessageBubble (incoming/outgoing/voice/typing), Tabs, Menu, TaskCard.
4. **Layout** — AppShell (nav rail + main + optional right panel), PhoneFrame для моб-превью.
5. **Screens** — Chats list → Conversation → Calls → Tasks → Calendar.
6. **Dark theme** — переключение через `[data-theme="dark"]`, проверка контрастов.

## Prompt for Claude Code

> Прочитай `docs/design_handoff_vkusnochat/design-system.html` и сопутствующий `README.md`. Создай `src/styles/tokens.css` со всеми CSS-переменными. Для каждого атома/молекулы из README создай файл в `src/components/ui/` в стиле нашего проекта. Не изобретай новые цвета — используй только токены. Для dark-темы используй селектор `[data-theme="dark"]` на `<html>`. Верни список созданных файлов и короткий changelog.
