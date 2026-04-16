import { redirect } from 'next/navigation'
import { getFirstGroupId } from '@/lib/actions/groups'
import { MessageSquare } from 'lucide-react'

export default async function HomePage() {
  const groupId = await getFirstGroupId()
  if (groupId) redirect(`/${groupId}`)

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-8">
      <MessageSquare size={40} className="text-white/10" strokeWidth={1} />
      <div>
        <p className="text-sm font-medium text-white/40">Выберите чат</p>
        <p className="mt-1 text-xs text-white/20">
          или обратитесь к администратору для доступа к группам
        </p>
      </div>
    </div>
  )
}
