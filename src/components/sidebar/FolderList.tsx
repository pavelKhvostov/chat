'use client'

import { useState } from 'react'
import { ChevronDown, FolderOpen } from 'lucide-react'
import { type FolderWithItems } from '@/lib/actions/folders'
import { ChatRow } from './ChatRow'

interface FolderListProps {
  folders: FolderWithItems[]
}

function FolderSection({ folder }: { folder: FolderWithItems }) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div>
      {/* Заголовок папки */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/30 hover:text-white/50 transition-colors duration-150"
      >
        <ChevronDown
          size={11}
          className={`transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
        />
        <FolderOpen size={11} />
        <span className="truncate">{folder.name}</span>
        <span className="ml-auto text-white/20 normal-case font-normal">
          {folder.items.length}
        </span>
      </button>

      {/* Чаты внутри папки */}
      {isOpen && (
        <div className="space-y-0.5">
          {folder.items.map(item => (
            <ChatRow key={item.id} group={item.group} />
          ))}
          {folder.items.length === 0 && (
            <p className="px-3 py-2 text-xs text-white/20">Пусто</p>
          )}
        </div>
      )}
    </div>
  )
}

export function FolderList({ folders }: FolderListProps) {
  if (folders.length === 0) return null

  return (
    <div className="space-y-0.5">
      {folders.map(folder => (
        <FolderSection key={folder.id} folder={folder} />
      ))}
    </div>
  )
}
