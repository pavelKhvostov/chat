'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type Database } from '@/lib/types/database.types'

type Group = Database['public']['Tables']['groups']['Row']

interface ChatRowProps {
  group: Group
  unreadCount?: number
  lastMessageText?: string
  lastMessageTime?: string
  isSubgroup?: boolean
}

// Генерирует инициалы и цвет аватара из названия группы
function getAvatarProps(name: string) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  const colors = [
    'bg-indigo-600',
    'bg-violet-600',
    'bg-blue-600',
    'bg-cyan-600',
    'bg-teal-600',
    'bg-emerald-600',
    'bg-amber-600',
    'bg-rose-600',
  ]
  const idx = name.charCodeAt(0) % colors.length
  return { initials, color: colors[idx] }
}

export function ChatRow({
  group,
  unreadCount = 0,
  lastMessageText,
  lastMessageTime,
  isSubgroup = false,
}: ChatRowProps) {
  const pathname = usePathname()
  const isActive = pathname === `/${group.id}`
  const { initials, color } = getAvatarProps(group.name)

  return (
    <Link
      href={`/${group.id}`}
      className={`
        flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150 cursor-pointer
        ${isSubgroup ? 'ml-8' : ''}
        ${isActive ? 'bg-indigo-600/15' : 'hover:bg-white/[0.04]'}
      `}
    >
      {/* Аватар */}
      <div className={`
        flex-shrink-0 flex items-center justify-center rounded-full text-white font-medium
        ${isSubgroup ? 'h-8 w-8 text-xs' : 'h-11 w-11 text-sm'}
        ${color}
      `}>
        {initials}
      </div>

      {/* Текст */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1">
          <span className={`
            truncate font-medium leading-tight
            ${isSubgroup ? 'text-xs' : 'text-sm'}
            ${isActive ? 'text-white' : 'text-white/90'}
          `}>
            {group.name}
          </span>
          {lastMessageTime && (
            <span className={`
              flex-shrink-0 text-xs
              ${unreadCount > 0 ? 'text-indigo-400' : 'text-white/30'}
            `}>
              {lastMessageTime}
            </span>
          )}
        </div>
        {lastMessageText && (
          <p className="truncate text-xs text-white/40 mt-0.5 leading-tight">
            {lastMessageText}
          </p>
        )}
        {!lastMessageText && !isSubgroup && (
          <p className="text-xs text-white/20 mt-0.5">Нет сообщений</p>
        )}
      </div>

      {/* Счётчик непрочитанных */}
      {unreadCount > 0 && (
        <div className="flex-shrink-0 flex items-center justify-center h-5 min-w-5 rounded-full bg-indigo-500 px-1.5">
          <span className="text-[10px] font-semibold text-white leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </div>
      )}
    </Link>
  )
}
