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
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-400 hover:text-ink-700 transition-colors duration-150"
      >
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
        />
        <FolderOpen size={12} />
        <span className="truncate">{folder.name}</span>
        <span className="ml-auto text-ink-300 normal-case font-normal">
          {folder.items.length}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-0.5 mt-1">
          {folder.items.map(item => (
            <ChatRow key={item.id} group={item.group} />
          ))}
          {folder.items.length === 0 && (
            <p className="px-3 py-2 text-xs text-ink-400">Пусто</p>
          )}
        </div>
      )}
    </div>
  )
}

export function FolderList({ folders }: FolderListProps) {
  if (folders.length === 0) return null

  return (
    <div className="space-y-1">
      {folders.map(folder => (
        <FolderSection key={folder.id} folder={folder} />
      ))}
    </div>
  )
}
