'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { SidebarDrawer } from './SidebarDrawer'

interface SidebarDrawerContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const SidebarDrawerContext = createContext<SidebarDrawerContextValue | null>(null)

export function useSidebarDrawer(): SidebarDrawerContextValue {
  const ctx = useContext(SidebarDrawerContext)
  if (!ctx) throw new Error('useSidebarDrawer must be used within ShellClient')
  return ctx
}

interface ShellClientProps {
  sidebar: ReactNode
  children: ReactNode
}

export function ShellClient({ sidebar, children }: ShellClientProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(v => !v), [])

  // Auto-close drawer on route change (mobile UX)
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
    <SidebarDrawerContext.Provider value={{ isOpen, open, close, toggle }}>
      <div className="flex h-screen overflow-hidden bg-bg">
        <SidebarDrawer isOpen={isOpen} onClose={close}>
          {sidebar}
        </SidebarDrawer>
        <main className="flex flex-1 flex-col overflow-hidden min-w-0">
          {children}
        </main>
      </div>
    </SidebarDrawerContext.Provider>
  )
}
