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
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/60 hover:text-white/90 transition-colors duration-150"
      >
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
        />
        <FolderOpen size={12} />
        <span className="truncate">{folder.name}</span>
        <span className="ml-auto text-white/50 normal-case font-normal">
          {folder.items.length}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-1 mt-1">
          {folder.items.map(item => (
            <ChatRow key={item.id} group={item.group} />
          ))}
          {folder.items.length === 0 && (
            <p className="px-3 py-2 text-xs text-white/40">Пусто</p>
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
