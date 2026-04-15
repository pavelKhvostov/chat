'use server'

import { createClient } from '@/lib/supabase/server'
import { type Database } from '@/lib/types/database.types'

type Group = Database['public']['Tables']['groups']['Row']

export type GroupWithChildren = Group & {
  children: Group[]
}

// Получить все группы где пользователь является участником
// Включает родительские группы для корректного отображения иерархии
export async function getGroupsForUser(): Promise<GroupWithChildren[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Получаем все group_id где пользователь — участник
  const { data: memberRows } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)

  if (!memberRows || memberRows.length === 0) return []

  const memberGroupIds = memberRows.map(r => r.group_id)

  // Получаем сами группы
  const { data: memberGroups } = await supabase
    .from('groups')
    .select('*')
    .in('id', memberGroupIds)
    .order('name')

  if (!memberGroups) return []

  // Собираем id родительских групп (которых нет в списке участника)
  const parentIds = memberGroups
    .map(g => g.parent_id)
    .filter((id): id is string => id !== null && !memberGroupIds.includes(id))

  // Загружаем родительские группы если нужно
  let parentGroups: Group[] = []
  if (parentIds.length > 0) {
    const { data } = await supabase
      .from('groups')
      .select('*')
      .in('id', parentIds)
      .order('name')
    parentGroups = data ?? []
  }

  const allGroups = [...parentGroups, ...memberGroups]

  // Строим дерево: top-level группы (parent_id = null) с children
  const topLevel = allGroups.filter(g => g.parent_id === null)
  const result: GroupWithChildren[] = topLevel.map(g => ({
    ...g,
    children: allGroups
      .filter(child => child.parent_id === g.id)
      .sort((a, b) => a.name.localeCompare(b.name)),
  }))

  return result.sort((a, b) => a.name.localeCompare(b.name))
}

// Получить первую доступную группу для редиректа с /
export async function getFirstGroupId(): Promise<string | null> {
  const groups = await getGroupsForUser()
  if (groups.length === 0) return null
  // Предпочитаем группу с подгруппами, иначе первую
  return groups[0]?.children[0]?.id ?? groups[0]?.id ?? null
}
