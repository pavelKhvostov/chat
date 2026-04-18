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

  const groupsInFolders = new Set(
    folders.flatMap(f => f.items.map(item => item.group.id))
  )

  const freeGroups = groups.filter(g => !groupsInFolders.has(g.id))

  return (
    <aside className="flex h-screen w-[360px] flex-shrink-0 flex-col bg-brand-primary">

      {/* Шапка: профиль + выход */}
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-white text-sm font-semibold">
          {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate leading-tight">
            {profile?.display_name ?? 'Пользователь'}
          </p>
          <p className="text-xs text-white/60 truncate leading-tight mt-0.5">
            {profile?.role === 'admin' ? 'Администратор' : 'Сотрудник'}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-150"
            title="Выйти"
          >
            <LogOut size={16} strokeWidth={1.5} />
          </button>
        </form>
      </div>

      {/* Строка поиска */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-3.5 py-2.5">
          <Search size={15} className="text-white/70 flex-shrink-0" strokeWidth={1.5} />
          <span className="text-sm text-white/60 select-none">Поиск</span>
        </div>
      </div>

      {/* Список чатов */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2">

        {folders.length > 0 && (
          <div className="mb-2">
            <FolderList folders={folders} />
          </div>
        )}

        {folders.length > 0 && freeGroups.length > 0 && (
          <div className="px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
              Все чаты
            </p>
          </div>
        )}

        <div className="space-y-1">
          {freeGroups.map(group => (
            <div key={group.id}>
              <ChatRow group={group} />
              {group.children.map(child => (
                <ChatRow key={child.id} group={child} isSubgroup />
              ))}
            </div>
          ))}
        </div>

        {groups.length === 0 && folders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <MessageSquareText size={32} className="text-white/30 mb-3" strokeWidth={1} />
            <p className="text-sm text-white/70">Нет доступных чатов</p>
            <p className="mt-1 text-xs text-white/50 leading-relaxed">
              Обратитесь к администратору, чтобы вас добавили в группу
            </p>
          </div>
        )}
      </nav>
    </aside>
  )
}
