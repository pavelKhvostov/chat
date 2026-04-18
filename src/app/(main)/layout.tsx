import { redirect } from 'next/navigation'
import { getUser } from '@/lib/actions/auth'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ShellClient } from '@/components/layout/ShellClient'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <ShellClient sidebar={<Sidebar />}>
      {children}
    </ShellClient>
  )
}
