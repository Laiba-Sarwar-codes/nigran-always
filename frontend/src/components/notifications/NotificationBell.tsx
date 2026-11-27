import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, CheckCheck, Trash2, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { getNotifications, getUnreadCount, markRead, markAllRead, deleteNotification } from '@/services/notifications'
import type { Notification } from '@/types/notifications'

function notifLink(n: Notification): string | null {
  if (n.notification_type === 'EXAM_ASSIGNED' && n.related_entity_id)
    return '/candidate/exams'
  if (n.notification_type === 'RESULT_PUBLISHED')
    return '/candidate/results'
  if (n.notification_type === 'EXAM_SUBMITTED' && n.related_entity_id)
    return `/examiner/submissions`
  return null
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const qc = useQueryClient()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data: countData } = useQuery({
    queryKey: ['notif-count'],
    queryFn: getUnreadCount,
    refetchInterval: 30000,
    enabled: !!user,
  })

  const { data: notifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications({ limit: 20 }),
    enabled: open,
  })

  const markReadMut = useMutation({
    mutationFn: markRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notif-count'] })
    },
  })

  const markAllMut = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notif-count'] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notif-count'] })
    },
  })

  const handleClick = (n: Notification) => {
    if (!n.is_read) markReadMut.mutate(n.id)
    const link = notifLink(n)
    if (link) { navigate(link); setOpen(false) }
  }

  const unread = countData?.unread_count ?? 0

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</span>
            {unread > 0 && (
              <button
                onClick={() => markAllMut.mutate()}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {!notifs?.length ? (
              <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No notifications
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors ${!n.is_read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                >
                  {!n.is_read && <span className="mt-1.5 h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />}
                  {n.is_read && <span className="mt-1.5 h-2 w-2 flex-shrink-0" />}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleClick(n)}>
                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{n.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {!n.is_read && (
                      <button onClick={() => markReadMut.mutate(n.id)} title="Mark read" className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => deleteMut.mutate(n.id)} title="Delete" className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {notifLink(n) && (
                      <button onClick={() => handleClick(n)} title="Go to" className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
