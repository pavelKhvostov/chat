import { redirect } from 'next/navigation'
import { getUser } from '@/lib/actions/auth'
import { Sidebar } from '@/components/sidebar/Sidebar'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f0f1a]">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden min-w-0">
        {children}
      </main>
    </div>
  )
}
