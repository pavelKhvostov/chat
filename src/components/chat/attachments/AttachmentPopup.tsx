'use client'

import { useEffect } from 'react'
import { Image as ImageIcon, Paperclip } from 'lucide-react'

export type AttachmentPickType = 'image' | 'file' | 'voice' | 'video_circle'

interface AttachmentPopupProps {
  open: boolean
  onClose: () => void
  onPick: (type: AttachmentPickType) => void
}

interface MenuItem {
  type: AttachmentPickType
  label: string
  icon: React.ReactNode
}

const ITEMS: MenuItem[] = [
  { type: 'image', label: 'Фото', icon: <ImageIcon size={18} strokeWidth={1.75} /> },
  { type: 'file', label: 'Файл', icon: <Paperclip size={18} strokeWidth={1.75} /> },
]

export function AttachmentPopup({ open, onClose, onPick }: AttachmentPopupProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handlePick = (type: AttachmentPickType) => {
    onPick(type)
    onClose()
  }

  return (
    <>
      {/* Mobile-only backdrop */}
      <button
        type="button"
        aria-label="Закрыть меню вложений"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30 md:bg-transparent md:pointer-events-none"
      />

      {/* Desktop: popover above paperclip; Mobile: bottom sheet */}
      <div
        role="menu"
        aria-label="Выбор вложения"
        className="
          fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-surface shadow-sh-1 border-t border-stroke pt-2 pb-6 px-2
          md:absolute md:inset-x-auto md:bottom-full md:left-0 md:mb-2 md:w-56 md:rounded-2xl md:border md:py-2 md:px-1.5 md:pb-2
        "
      >
        {/* Mobile handle */}
        <div className="md:hidden flex justify-center pb-2">
          <span className="h-1 w-10 rounded-full bg-stroke" />
        </div>
        {ITEMS.map((item) => (
          <button
            key={item.type}
            type="button"
            role="menuitem"
            onClick={() => handlePick(item.type)}
            className="flex w-full items-center gap-3 min-h-[44px] px-4 rounded-xl text-left text-ink-900 hover:bg-coral-100 transition-colors"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-coral-100 text-coral-500">
              {item.icon}
            </span>
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  )
}
