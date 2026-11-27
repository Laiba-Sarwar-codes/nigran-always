import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '@/layouts/DashboardLayout'
import { dashboardService } from '@/services/dashboard'
import { useAuth } from '@/hooks/useAuth'
import { Users, GraduationCap, UserCheck, Activity, FileText, ArrowRight } from 'lucide-react'
import type { ActivityItem } from '@/types/dashboard'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: dashboardService.adminStats })
  const { data: activity } = useQuery({ queryKey: ['admin-activity', 1], queryFn: () => dashboardService.adminActivity(1, 5) })

  const firstName = user?.full_name?.split(' ')[0] ?? 'Admin'

  const kpis = [
    { label: 'Total users',    value: String(stats?.total_users ?? 0).padStart(2, '0'),    icon: Users,         sub: 'Registered accounts' },
    { label: 'Candidates',     value: String(stats?.candidates ?? 0).padStart(2, '0'),       icon: GraduationCap, sub: 'Active candidates' },
    { label: 'Examiners',      value: String(stats?.examiners ?? 0).padStart(2, '0'),        icon: UserCheck,     sub: 'Assigned examiners' },
    { label: 'Active users',   value: String(stats?.active_users ?? 0).padStart(2, '0'),     icon: Activity,      sub: 'Currently enabled' },
  ]

  return (
    <DashboardLayout>
      {/* Page heading */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>
            {greeting()}, {firstName}.
          </h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(157 10% 44%)' }}>A measured view of the work ahead.</p>
        </div>
        <button onClick={() => navigate('/admin/users')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white self-start"
                style={{ background: '#007A62' }}>
          + Invite people
        </button>
      </div>

      {/* Hero banner */}
      <div className="n360-card p-6 mb-6 relative overflow-hidden">
        <div className="relative z-10 max-w-sm">
          <p className="text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#007A62' }}>
            ● Nigran 360 · Workspace
          </p>
          <h2 className="text-xl font-bold leading-snug mb-2" style={{ color: 'hsl(161 38% 13%)' }}>
            Every assessment, in one clear view.
          </h2>
          <p className="text-sm mb-4" style={{ color: 'hsl(157 10% 44%)' }}>
            A thoughtful overview for the people who keep every examination moving.
          </p>
          <Link to="/admin/exams"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#007A62' }}>
            Review examinations <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-center">
          <div className="w-48 h-48 rounded-full border-4" style={{ borderColor: '#007A62' }} />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="n360-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>{k.label}</p>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'hsl(155 24% 94%)' }}>
                <k.icon className="w-3.5 h-3.5" style={{ color: '#007A62' }} />
              </div>
            </div>
            <p className="text-3xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>{k.value}</p>
            <p className="text-xs mt-1" style={{ color: 'hsl(157 10% 44%)' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Bottom row: quick actions + recent activity */}
      <div className="grid lg:grid-cols-5 gap-5">
        {/* Quick actions */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'hsl(161 38% 13%)' }}>Quick actions</h3>
          {[
            { label: 'People & access', desc: 'Manage users and roles', href: '/admin/users', icon: Users },
            { label: 'Examinations', desc: 'Review all examinations', href: '/admin/exams', icon: FileText },
            { label: 'Platform activity', desc: 'Audit log and history', href: '/admin/activity', icon: Activity },
          ].map((a) => (
            <Link key={a.href} to={a.href}
                  className="flex items-center gap-3 p-3.5 n360-card hover:border-green-200 transition-all group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                   style={{ background: 'hsl(155 24% 94%)' }}>
                <a.icon className="w-4 h-4" style={{ color: '#007A62' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>{a.label}</p>
                <p className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>{a.desc}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#007A62' }} />
            </Link>
          ))}
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-3 n360-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'hsl(150 22% 86%)' }}>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'hsl(157 10% 44%)' }}>Audit trail</p>
              <h3 className="text-sm font-semibold mt-0.5" style={{ color: 'hsl(161 38% 13%)' }}>Recent changes</h3>
            </div>
            <Link to="/admin/activity" className="text-xs font-medium flex items-center gap-1" style={{ color: '#007A62' }}>
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {(activity?.items ?? []).length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: 'hsl(157 10% 44%)' }}>No activity yet</div>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'hsl(150 22% 86%)' }}>
              {activity?.items.map((item: ActivityItem) => (
                <li key={item.id} className="px-5 py-3 flex items-center gap-3 hover:bg-green-50/50 transition-colors">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                       style={{ background: 'hsl(155 24% 94%)' }}>
                    <Activity className="w-3.5 h-3.5" style={{ color: '#007A62' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'hsl(161 38% 13%)' }}>
                      {item.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>
                      {item.actor_name ?? 'System'}
                    </p>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: 'hsl(157 10% 44%)' }}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
