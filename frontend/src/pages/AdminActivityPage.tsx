import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '@/layouts/DashboardLayout'
import LoadingState from '@/components/common/LoadingState'
import ErrorState from '@/components/common/ErrorState'
import { dashboardService } from '@/services/dashboard'
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react'
import type { ActivityItem } from '@/types/dashboard'

const actionColor: Record<string, string> = {
  register: 'bg-green-100 text-green-700',
  login: 'bg-blue-100 text-blue-700',
  admin_create_user: 'bg-purple-100 text-purple-700',
  admin_patch_user: 'bg-amber-100 text-amber-700',
  admin_set_active: 'bg-teal-100 text-teal-700',
  admin_deactivate: 'bg-red-100 text-red-700',
}

export default function AdminActivityPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-activity-full', page],
    queryFn: () => dashboardService.adminActivity(page, 30),
  })

  const totalPages = Math.ceil((data?.total ?? 0) / (data?.page_size ?? 30))

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Platform Activity</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data?.total ?? 0} total audit events
          </p>
        </div>

        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {isLoading ? (
            <LoadingState message="Loading activity…" />
          ) : isError ? (
            <ErrorState retry={refetch} />
          ) : data?.items.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No activity recorded yet</div>
          ) : (
            <div className="divide-y divide-border">
              {data?.items.map((item: ActivityItem) => (
                <div key={item.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-secondary/20 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${actionColor[item.action] ?? 'bg-secondary text-muted-foreground'}`}>
                        {item.action.replace(/_/g, ' ')}
                      </span>
                      {item.resource_type && (
                        <span className="text-xs text-muted-foreground capitalize">{item.resource_type}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium text-foreground">{item.actor_name ?? 'System'}</span>
                      {item.actor_email && ` (${item.actor_email})`}
                      {' · '}{new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-1.5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded border border-border disabled:opacity-40 hover:bg-secondary transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="p-1.5 rounded border border-border disabled:opacity-40 hover:bg-secondary transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
