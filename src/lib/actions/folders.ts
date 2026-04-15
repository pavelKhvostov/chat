'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type Database } from '@/lib/types/database.types'

type Folder = Database['public']['Tables']['folders']['Row']
type Group = Database['public']['Tables']['groups']['Row']

export type FolderWithItems = Folder & {
  items: Array<{ id: string; group: Group; position: number }>
}

// Получить все папки пользователя с содержимым
export async function getFoldersForUser(): Promise<FolderWithItems[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: folders } = await supabase
    .from('folders')
    .select(`
      *,
      folder_items (
        id,
        position,
        groups (*)
      )
    `)
    .eq('user_id', user.id)
    .order('position')

  if (!folders) return []

  return folders.map(folder => ({
    ...folder,
    items: (folder.folder_items ?? [])
      .map((item: { id: string; position: number; groups: Group | null }) => ({
        id: item.id,
        group: item.groups!,
        position: item.position,
      }))
      .filter((item: { group: Group | null }) => item.group !== null)
      .sort((a: { position: number }, b: { position: number }) => a.position - b.position),
  }))
}

// Создать новую папку
export async function createFolder(name: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Не авторизован' }

  const { error } = await supabase
    .from('folders')
    .insert({ user_id: user.id, name, position: 0 })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return {}
}

// Переместить группу в папку (или убрать из папки если folderId = null)
export async function moveGroupToFolder(
  groupId: string,
  folderId: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Не авторизован' }

  // Удаляем из всех папок сначала
  await supabase
    .from('folder_items')
    .delete()
    .eq('group_id', groupId)

  // Добавляем в новую папку если указана
  if (folderId) {
    const { error } = await supabase
      .from('folder_items')
      .insert({ folder_id: folderId, group_id: groupId, position: 0 })

    if (error) return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return {}
}

// Удалить папку (группы остаются, просто выходят из папки)
export async function deleteFolder(folderId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Не авторизован' }

  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return {}
}
