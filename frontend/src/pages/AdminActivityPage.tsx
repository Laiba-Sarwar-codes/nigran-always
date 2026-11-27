import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '@/layouts/DashboardLayout'
import { dashboardService } from '@/services/dashboard'
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ActivityItem } from '@/types/dashboard'

const iconColors: Record<string, string> = {
  register: '#007A62', login: '#007A62',
  admin_create_user: '#6366f1', admin_patch_user: '#f59e0b',
  admin_set_active: '#007A62', admin_deactivate: '#ef4444',
  enroll_candidate: '#007A62', submit_attempt: '#f59e0b',
  publish_result: '#007A62',
}

export default function AdminActivityPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-activity', page],
    queryFn: () => dashboardService.adminActivity(page, 20),
  })

  const totalPages = Math.ceil((data?.total ?? 0) / (data?.page_size ?? 20))

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>Platform activity</h1>
        <p className="text-sm mt-1" style={{ color: 'hsl(157 10% 44%)' }}>A clear record of what changed and when.</p>
      </div>

      <div className="n360-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'hsl(150 22% 86%)' }}>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'hsl(157 10% 44%)' }}>Audit trail</p>
            <h2 className="text-sm font-semibold mt-0.5" style={{ color: 'hsl(161 38% 13%)' }}>Recent changes</h2>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full border" style={{ borderColor: 'hsl(150 22% 86%)', color: 'hsl(157 10% 44%)' }}>
            Past 7 days
          </span>
        </div>

        {isLoading && <div className="py-12 text-center text-sm" style={{ color: 'hsl(157 10% 44%)' }}>Loading…</div>}
        {isError && (
          <div className="py-12 text-center">
            <p className="text-sm mb-2" style={{ color: 'hsl(157 10% 44%)' }}>Failed to load activity</p>
            <button onClick={() => refetch()} className="text-sm font-medium" style={{ color: '#007A62' }}>Retry</button>
          </div>
        )}

        {!isLoading && !isError && (data?.items.length ?? 0) === 0 && (
          <div className="py-16 text-center text-sm" style={{ color: 'hsl(157 10% 44%)' }}>No activity yet</div>
        )}

        {!isLoading && !isError && (data?.items ?? []).length > 0 && (
          <ul className="divide-y" style={{ borderColor: 'hsl(150 22% 86%)' }}>
            {data?.items.map((item: ActivityItem) => (
              <li key={item.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-green-50/50 transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                     style={{ background: 'hsl(155 24% 94%)' }}>
                  <Activity className="w-3.5 h-3.5" style={{ color: iconColors[item.action] ?? '#007A62' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>
                    {item.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </p>
                  <p className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>
                    {item.actor_name ?? 'System'}
                    {item.resource_type ? ` · ${item.resource_type}` : ''}
                  </p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: 'hsl(157 10% 44%)' }}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t flex items-center justify-between text-xs"
               style={{ borderColor: 'hsl(150 22% 86%)', color: 'hsl(157 10% 44%)' }}>
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                      className="p-1 rounded border disabled:opacity-40 hover:bg-green-50 transition-colors"
                      style={{ borderColor: 'hsl(150 22% 86%)' }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                      className="p-1 rounded border disabled:opacity-40 hover:bg-green-50 transition-colors"
                      style={{ borderColor: 'hsl(150 22% 86%)' }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="px-5 py-3 border-t" style={{ borderColor: 'hsl(150 22% 86%)' }}>
          <p className="flex items-center gap-1.5 text-xs" style={{ color: 'hsl(157 10% 44%)' }}>
            <span className="w-3 h-3 rounded-full border-2 flex-shrink-0" style={{ borderColor: 'hsl(157 10% 44%)' }} />
            Illustrative platform activity
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
