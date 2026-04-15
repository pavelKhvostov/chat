---
phase: 03-layout-sidebar
plan: "01"
subsystem: server-actions
tags: [groups, folders, server-actions, supabase, rls]
dependency_graph:
  requires: []
  provides: [getGroupsForUser, getFirstGroupId, getFoldersForUser, createFolder, moveGroupToFolder, deleteFolder]
  affects: [sidebar, layout, group-tree]
tech_stack:
  added: []
  patterns: [server-actions, supabase-rls, revalidatePath]
key_files:
  created:
    - src/lib/actions/groups.ts
    - src/lib/actions/folders.ts
  modified: []
decisions:
  - "Родительские группы загружаются отдельным запросом чтобы sidebar отображал иерархию даже если пользователь — участник только подгруппы"
  - "moveGroupToFolder удаляет из всех папок перед вставкой — гарантирует что группа только в одной папке"
metrics:
  duration: "5m"
  completed: "2026-04-15"
---

# Phase 03 Plan 01: Server Actions для групп и папок — Summary

Server Actions для загрузки иерархии групп и управления личными папками пользователя с RLS-корректными запросами к Supabase.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Server Actions для групп | 1ecf6ef | src/lib/actions/groups.ts |
| 2 | Server Actions для папок | 1ecf6ef | src/lib/actions/folders.ts |

## What Was Built

### src/lib/actions/groups.ts

- `getGroupsForUser()` — возвращает все группы где пользователь является участником (`group_members`), включая родительские группы для корректного отображения иерархии. Строит дерево: top-level группы с вложенными `children`.
- `getFirstGroupId()` — возвращает id первой доступной группы (предпочитает первую подгруппу), используется для редиректа с `/`.
- Тип `GroupWithChildren` — `Group & { children: Group[] }`.

### src/lib/actions/folders.ts

- `getFoldersForUser()` — загружает папки пользователя с вложенными `folder_items` и данными групп через Supabase JOIN.
- `createFolder(name)` — создаёт папку с `user_id` текущего пользователя, вызывает `revalidatePath`.
- `moveGroupToFolder(groupId, folderId)` — сначала удаляет группу из всех папок, затем добавляет в указанную (или просто удаляет если `folderId = null`).
- `deleteFolder(folderId)` — удаляет папку с проверкой `user_id` (пользователь может удалить только свои папки).
- Тип `FolderWithItems` — `Folder & { items: Array<{id, group, position}> }`.

## Deviations from Plan

None - план выполнен точно как написан.

## Self-Check

- [x] `src/lib/actions/groups.ts` существует
- [x] `src/lib/actions/folders.ts` существует
- [x] Оба файла начинаются с `'use server'`
- [x] Все функции проверяют сессию через `supabase.auth.getUser()`
- [x] Коммит `1ecf6ef` существует

## Self-Check: PASSED
