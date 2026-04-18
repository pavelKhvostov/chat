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

// Deterministic avatar gradient from design system:
// 135° shade-500 → shade-700, families: coral, blue, green, violet, amber, slate.
const AVATAR_GRADIENTS = [
  'from-coral-500 to-coral-600',
  'from-[#3E74E8] to-[#1F4FBD]',
  'from-[#2EAE74] to-[#1E7B4E]',
  'from-[#7A5AF8] to-[#5333C4]',
  'from-[#E8A83C] to-[#9A6E18]',
  'from-[#5B6478] to-[#2A3145]',
]

function gradientFor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[idx]
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
  const gradient = gradientFor(group.name)

  return (
    <Link
      href={`/${group.id}`}
      className={`
        flex items-center gap-3 rounded-sm px-3 py-2.5 transition-colors duration-150 cursor-pointer
        ${isSubgroup ? 'ml-6' : ''}
        ${isActive ? 'bg-coral-50' : 'hover:bg-ink-50'}
      `}
    >
      {/* Аватар с градиентом */}
      <div className={`
        flex-shrink-0 flex items-center justify-center rounded-full font-bold text-white bg-gradient-to-br ${gradient}
        ${isSubgroup ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-[13px]'}
      `}>
        {initials}
      </div>

      {/* Текст */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1">
          <span className={`
            truncate leading-tight
            ${isSubgroup ? 'text-[13px] font-medium' : 'text-[15px] font-semibold'}
            ${isActive ? 'text-coral-600' : 'text-ink-900'}
          `}>
            {group.name}
          </span>
          {lastMessageTime && (
            <span className="flex-shrink-0 text-[11px] font-mono text-ink-400 font-num">
              {lastMessageTime}
            </span>
          )}
        </div>
        {lastMessageText && (
          <p className="truncate text-[13px] text-ink-500 mt-0.5 leading-tight">
            {lastMessageText}
          </p>
        )}
        {!lastMessageText && !isSubgroup && (
          <p className="text-[13px] text-ink-400 mt-0.5">Нет сообщений</p>
        )}
      </div>

      {/* Counter badge */}
      {unreadCount > 0 && (
        <div className="flex-shrink-0 flex items-center justify-center h-5 min-w-5 rounded-pill bg-coral-500 px-1.5">
          <span className="text-[11px] font-bold text-white leading-none font-num">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </div>
      )}
    </Link>
  )
}
