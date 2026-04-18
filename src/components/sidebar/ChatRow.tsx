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

function getAvatarInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
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
  const initials = getAvatarInitials(group.name)

  return (
    <Link
      href={`/${group.id}`}
      className={`
        flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors duration-150 cursor-pointer
        ${isSubgroup ? 'ml-6' : ''}
        ${isActive ? 'bg-white shadow-card' : 'hover:bg-white/10'}
      `}
    >
      {/* Аватар */}
      <div className={`
        flex-shrink-0 flex items-center justify-center rounded-full font-semibold
        ${isSubgroup ? 'h-8 w-8 text-xs' : 'h-11 w-11 text-sm'}
        ${isActive ? 'bg-brand-primary text-white' : 'bg-white/25 text-white'}
      `}>
        {initials}
      </div>

      {/* Текст */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1">
          <span className={`
            truncate font-medium leading-tight
            ${isSubgroup ? 'text-xs' : 'text-sm'}
            ${isActive ? 'text-brand-text' : 'text-white'}
          `}>
            {group.name}
          </span>
          {lastMessageTime && (
            <span className={`
              flex-shrink-0 text-xs font-mono
              ${isActive ? 'text-brand-text-muted' : 'text-white/60'}
            `}>
              {lastMessageTime}
            </span>
          )}
        </div>
        {lastMessageText && (
          <p className={`truncate text-xs mt-0.5 leading-tight ${
            isActive ? 'text-brand-text-muted' : 'text-white/60'
          }`}>
            {lastMessageText}
          </p>
        )}
        {!lastMessageText && !isSubgroup && (
          <p className={`text-xs mt-0.5 ${
            isActive ? 'text-brand-text-subtle' : 'text-white/45'
          }`}>
            Нет сообщений
          </p>
        )}
      </div>

      {/* Счётчик непрочитанных */}
      {unreadCount > 0 && (
        <div className="flex-shrink-0 flex items-center justify-center h-5 min-w-5 rounded-full bg-white px-1.5">
          <span className="text-[10px] font-semibold text-brand-primary leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </div>
      )}
    </Link>
  )
}
