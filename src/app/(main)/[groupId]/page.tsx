import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Hash, Users } from 'lucide-react'

interface Props {
  params: Promise<{ groupId: string }>
}

export default async function GroupPage({ params }: Props) {
  const { groupId } = await params
  const supabase = await createClient()

  const [{ data: group }, { count: memberCount }] = await Promise.all([
    supabase
      .from('groups')
      .select('name, description, parent_id')
      .eq('id', groupId)
      .single(),
    supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId),
  ])

  if (!group) notFound()

  return (
    <div className="flex h-full flex-col">
      {/* Шапка чата — Telegram style */}
      <header className="flex items-center gap-3 border-b border-white/[0.06] bg-[#17212b] px-5 py-3 flex-shrink-0">
        {/* Аватар группы */}
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600/30 text-indigo-300">
          <Hash size={16} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-white/95 leading-tight truncate">
            {group.name}
          </h1>
          <p className="text-xs text-white/40 leading-tight flex items-center gap-1 mt-0.5">
            <Users size={10} strokeWidth={1.5} />
            {memberCount ?? 0} участников
          </p>
        </div>
      </header>

      {/* Область сообщений — Phase 4 */}
      <div className="flex flex-1 items-center justify-center bg-[#0f0f1a]">
        <div className="text-center">
          <Hash size={36} className="mx-auto text-white/10 mb-3" strokeWidth={1} />
          <p className="text-sm text-white/30 font-medium">{group.name}</p>
          <p className="mt-1 text-xs text-white/20">
            Сообщения появятся в следующей фазе разработки
          </p>
        </div>
      </div>
    </div>
  )
}
