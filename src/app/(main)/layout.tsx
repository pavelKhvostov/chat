import { redirect } from 'next/navigation'
import { getUser } from '@/lib/actions/auth'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-[#0f0f1a] text-white">
      {children}
    </div>
  )
}
