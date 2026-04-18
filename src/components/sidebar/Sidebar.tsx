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
    <aside className="flex h-screen w-full flex-col bg-surface border-r border-stroke md:w-[360px] md:flex-shrink-0">

      {/* Header: заголовок + выход */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-stroke">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-coral-500 text-white text-sm font-bold shadow-accent-glow">
          {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-ink-900 truncate leading-tight">
            {profile?.display_name ?? 'Пользователь'}
          </p>
          <p className="text-xs text-ink-500 truncate leading-tight mt-0.5">
            {profile?.role === 'admin' ? 'Администратор' : 'Сотрудник'}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex h-10 w-10 items-center justify-center rounded-sm text-ink-500 hover:text-ink-900 hover:bg-ink-50 transition-colors duration-150"
            title="Выйти"
          >
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        </form>
      </div>

      {/* Search pill */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-2 rounded-sm bg-ink-50 px-3.5 py-2.5 border border-stroke">
          <Search size={15} className="text-ink-400 flex-shrink-0" strokeWidth={1.75} />
          <span className="text-[13px] text-ink-400 select-none">Поиск</span>
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-400">
              Все чаты
            </p>
          </div>
        )}

        <div className="space-y-0.5">
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
            <MessageSquareText size={32} className="text-ink-300 mb-3" strokeWidth={1.25} />
            <p className="text-sm text-ink-500">Нет доступных чатов</p>
            <p className="mt-1 text-xs text-ink-400 leading-relaxed">
              Обратитесь к администратору, чтобы вас добавили в группу
            </p>
          </div>
        )}
      </nav>
    </aside>
  )
}
