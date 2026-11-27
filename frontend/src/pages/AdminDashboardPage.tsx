import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import DashboardLayout from '@/layouts/DashboardLayout'
import StatCard from '@/components/ui/StatCard'
import LoadingState from '@/components/common/LoadingState'
import ErrorState from '@/components/common/ErrorState'
import { dashboardService } from '@/services/dashboard'
import { Users, UserCheck, GraduationCap, Activity, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ActivityItem } from '@/types/dashboard'

function ActionBadge({ action }: { action: string }) {
  const map: Record<string, string> = {
    register: 'bg-green-100 text-green-700',
    login: 'bg-blue-100 text-blue-700',
    admin_create_user: 'bg-purple-100 text-purple-700',
    admin_patch_user: 'bg-amber-100 text-amber-700',
    admin_set_active: 'bg-teal-100 text-teal-700',
    admin_deactivate: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map[action] ?? 'bg-secondary text-muted-foreground'}`}>
      {action.replace(/_/g, ' ')}
    </span>
  )
}

function ActivityLog() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-activity', page],
    queryFn: () => dashboardService.adminActivity(page),
  })

  if (isLoading) return <LoadingState message="Loading activity…" />
  if (isError) return <ErrorState retry={refetch} />

  const totalPages = Math.ceil((data?.total ?? 0) / (data?.page_size ?? 20))

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground text-sm">Recent Activity</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{data?.total ?? 0} total events</p>
      </div>
      {data?.items.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">No activity yet</div>
      ) : (
        <div className="divide-y divide-border">
          {data?.items.map((item: ActivityItem) => (
            <div key={item.id} className="px-5 py-3 flex items-start gap-3 hover:bg-secondary/20 transition-colors">
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <ActionBadge action={item.action} />
                  {item.resource_type && (
                    <span className="text-xs text-muted-foreground">{item.resource_type}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.actor_name ?? 'System'} · {new Date(item.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1 rounded border border-border disabled:opacity-40 hover:bg-secondary transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="p-1 rounded border border-border disabled:opacity-40 hover:bg-secondary transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: dashboardService.adminStats,
  })

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform overview and user management</p>
        </div>

        {isLoading ? (
          <LoadingState message="Loading stats…" />
        ) : isError ? (
          <ErrorState retry={refetch} />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Users" value={stats?.total_users ?? 0} icon={Users} color="blue" />
            <StatCard title="Candidates" value={stats?.candidates ?? 0} icon={GraduationCap} color="green" />
            <StatCard title="Examiners" value={stats?.examiners ?? 0} icon={UserCheck} color="purple" />
            <StatCard title="Active Users" value={stats?.active_users ?? 0} icon={Activity} color="amber" />
          </div>
        )}

        {/* Examinations stat (Phase 4+) */}
        <div className="p-4 bg-white rounded-xl border border-border border-dashed">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Examinations</p>
              <p className="text-xs text-muted-foreground">Available from Phase 4</p>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid sm:grid-cols-2 gap-3">
          <Link to="/admin/users"
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all group">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">User Management</p>
              <p className="text-xs text-muted-foreground">Create, search and manage accounts</p>
            </div>
          </Link>
          <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-border opacity-50 cursor-not-allowed">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Examinations</p>
              <p className="text-xs text-muted-foreground">Coming in Phase 4</p>
            </div>
          </div>
        </div>

        <ActivityLog />
      </div>
    </DashboardLayout>
  )
}
