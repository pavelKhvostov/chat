---
phase: 05-attachments
created: 2026-04-18
test_framework: none
validation_strategy: static_checks_only
---

# Phase 05: Validation Strategy

## Test Framework Status

**Нет настроенного test framework в проекте** (ни jest/vitest/playwright). Это осознанное решение для MVP на ~100 пользователей — формальные юнит-тесты отложены на Phase 10 (QA).

## Что используется вместо тестов

| Механизм | Что проверяет | Когда запускается |
|----------|---------------|-------------------|
| `npx tsc --noEmit` | Типобезопасность всех файлов | После каждой задачи |
| `npm run lint` | ESLint правила + code style | После каждой задачи |
| `npm run build` | Next.js production build (type-check + bundle) | Перед деплоем |
| Manual human-verify checkpoints | End-to-end UX на реальных устройствах | После 05-02 (mobile), после 05-07 (полный flow) |
| Supabase RLS | Безопасность загрузок и доступа к файлам | Постоянно (in-DB) |
| Vercel preview deploys | Визуальная проверка в браузере | После каждого push |

## Nyquist Dimension 8 — Validation Architecture

Каждый PLAN.md содержит acceptance_criteria, которые проверяются одним из:
- `grep -q 'pattern' file.ts` — наличие конкретной строки/паттерна
- `test -f file` — существование файла
- Ручная проверка в dev-режиме (human-verify checkpoints)

Нет failing tests → нет automated regression safety. Это компенсируется:
1. Блокирующими human-verify checkpoints после waves 1 и 4
2. Production deploy preview URL для каждого плана
3. TypeScript strict mode (uncovered paths ловятся компилятором)

## Что явно не валидируется автоматически

- Фактическое качество записи голосовых (человек слушает вручную)
- Визуальный рендер видео-кружка на разных устройствах (preview deploy)
- UX hold-to-record на реальных touch-устройствах (human-verify 05-05)
- Корректность MIME-sniffing на экзотических файлах (принимаем риск — bucket приватный)

## Следующий шаг по тестам

Phase 10 (QA) добавит vitest + Playwright для regression suite. До этого — Phase 5 опирается на tsc + lint + build + human verify. Это зафиксировано как tech-debt в `.planning/codebase/TESTING.md`.

---

*Phase: 05-attachments*
*Validation strategy recorded: 2026-04-18*
