'use client'

import { ReactNode } from 'react'

interface SidebarDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export function SidebarDrawer({ isOpen, onClose, children }: SidebarDrawerProps) {
  return (
    <>
      {/* Mobile backdrop: only visible when drawer open and viewport <md */}
      {isOpen && (
        <button
          type="button"
          aria-label="Закрыть меню"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}

      {/* Drawer container */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-[320px] max-w-[85vw] transform
          transition-transform duration-200 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:static md:z-auto md:w-[360px] md:max-w-none md:translate-x-0 md:flex-shrink-0
        `}
      >
        {children}
      </aside>
    </>
  )
}
