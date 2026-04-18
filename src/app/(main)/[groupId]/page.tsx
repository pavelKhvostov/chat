import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Hash, Users } from 'lucide-react'
import { fetchMessages } from '@/lib/actions/messages'
import { ChatWindow } from '@/components/chat/ChatWindow'

interface Props {
  params: Promise<{ groupId: string }>
}

export default async function GroupPage({ params }: Props) {
  const { groupId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: group } = await supabase
    .from('groups')
    .select('name, description, parent_id')
    .eq('id', groupId)
    .single()

  if (!group) notFound()

  const [{ count: memberCount }, initialMessages, { data: members }] = await Promise.all([
    supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', groupId),
    fetchMessages(groupId),
    supabase.from('group_members').select('user_id').eq('group_id', groupId),
  ])

  // Загружаем профили всех участников на сервере (где сессия точно валидна)
  const memberIds = (members ?? []).map((m) => m.user_id)
  const { data: memberProfiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', memberIds)

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-full flex-col bg-surface-2">
      {/* Шапка чата */}
      <header className="flex items-center gap-3 bg-surface border-b border-stroke px-5 py-3 flex-shrink-0">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-coral-100 text-coral-600">
          <Hash size={16} strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-ink-900 leading-tight truncate">
            {group.name}
          </h1>
          <p className="text-[11px] text-success leading-tight flex items-center gap-1 mt-0.5">
            <Users size={11} strokeWidth={1.75} className="text-ink-400" />
            <span className="text-ink-500">{memberCount ?? 0} участников · онлайн</span>
          </p>
        </div>
      </header>

      <ChatWindow
        groupId={groupId}
        currentUserId={user.id}
        currentUserName={profile?.display_name ?? 'Пользователь'}
        initialMessages={initialMessages}
        memberProfiles={memberProfiles ?? []}
      />
    </div>
  )
}
