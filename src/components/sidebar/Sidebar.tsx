import { getGroupsForUser } from '@/lib/actions/groups'
import { getFoldersForUser } from '@/lib/actions/folders'
import { ChatRow } from './ChatRow'
import { FolderList } from './FolderList'
import { getProfile, signOut } from '@/lib/actions/auth'
import { LogOut, Search, MessageSquareText } from 'lucide-react'

export async function Sidebar() {
  const [groups, folders, profile] = await Promise.all([
    getGroupsForUser(),
    getFoldersForUser(),
    getProfile(),
  ])

  // ID групп в папках — не показываем их повторно в общем списке
  const groupsInFolders = new Set(
    folders.flatMap(f => f.items.map(item => item.group.id))
  )

  // Плоский список всех групп и подгрупп вне папок
  const freeGroups = groups.filter(g => !groupsInFolders.has(g.id))

  return (
    <aside className="flex h-screen w-[360px] flex-shrink-0 flex-col bg-[#17212b] border-r border-white/[0.06]">

      {/* Шапка: профиль + поиск */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
        {/* Аватар пользователя */}
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-semibold">
          {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/90 truncate leading-tight">
            {profile?.display_name ?? 'Пользователь'}
          </p>
          <p className="text-xs text-white/35 truncate leading-tight">
            {profile?.role === 'admin' ? 'Администратор' : 'Сотрудник'}
          </p>
        </div>
        {/* Выход */}
        <form action={signOut}>
          <button
            type="submit"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors duration-150"
            title="Выйти"
          >
            <LogOut size={15} strokeWidth={1.5} />
          </button>
        </form>
      </div>

      {/* Строка поиска */}
      <div className="px-3 py-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2">
          <Search size={13} className="text-white/30 flex-shrink-0" strokeWidth={1.5} />
          <span className="text-sm text-white/25 select-none">Поиск</span>
        </div>
      </div>

      {/* Список чатов */}
      <nav className="flex-1 overflow-y-auto py-1">

        {/* Папки */}
        {folders.length > 0 && (
          <div className="mb-1">
            <FolderList folders={folders} />
          </div>
        )}

        {/* Разделитель если есть и папки, и свободные группы */}
        {folders.length > 0 && freeGroups.length > 0 && (
          <div className="px-3 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20">
              Все чаты
            </p>
          </div>
        )}

        {/* Группы вне папок */}
        <div className="space-y-0.5 px-1">
          {freeGroups.map(group => (
            <div key={group.id}>
              <ChatRow group={group} />
              {group.children.map(child => (
                <ChatRow key={child.id} group={child} isSubgroup />
              ))}
            </div>
          ))}
        </div>

        {/* Пустое состояние */}
        {groups.length === 0 && folders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <MessageSquareText size={32} className="text-white/10 mb-3" strokeWidth={1} />
            <p className="text-sm text-white/30">Нет доступных чатов</p>
            <p className="mt-1 text-xs text-white/20 leading-relaxed">
              Обратитесь к администратору, чтобы вас добавили в группу
            </p>
          </div>
        )}
      </nav>
    </aside>
  )
}
