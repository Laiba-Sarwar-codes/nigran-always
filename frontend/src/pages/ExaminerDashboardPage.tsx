import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '@/layouts/DashboardLayout'
import { dashboardService } from '@/services/dashboard'
import { useAuth } from '@/hooks/useAuth'
import { FileText, BookOpen, ClipboardList, ArrowRight, Radio } from 'lucide-react'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function statusBadge(status: string) {
  if (status === 'PUBLISHED') return 'badge badge-live'
  if (status === 'DRAFT') return 'badge badge-draft'
  return 'badge badge-upcoming'
}
function statusLabel(status: string) {
  if (status === 'PUBLISHED') return 'Live'
  if (status === 'DRAFT') return 'Draft'
  return status
}

export default function ExaminerDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: stats } = useQuery({ queryKey: ['examiner-stats'], queryFn: dashboardService.examinerStats })
  const { data: recentExams } = useQuery({ queryKey: ['examiner-recent-exams'], queryFn: dashboardService.examinerRecentExams })

  const firstName = user?.full_name?.split(' ')[0] ?? 'Examiner'

  return (
    <DashboardLayout>
      {/* Heading */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>
            {greeting()}, {firstName}.
          </h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(157 10% 44%)' }}>A measured view of the work ahead.</p>
        </div>
        <button onClick={() => navigate('/examiner/exams')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white self-start"
                style={{ background: '#007A62' }}>
          + New examination
        </button>
      </div>

      {/* Hero banner */}
      <div className="n360-card p-6 mb-6 relative overflow-hidden">
        <div className="relative z-10 max-w-sm">
          <p className="text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#007A62' }}>
            ● Nigran 360 · Workspace
          </p>
          <h2 className="text-xl font-bold leading-snug mb-2" style={{ color: 'hsl(161 38% 13%)' }}>
            Your next assessment, well prepared.
          </h2>
          <p className="text-sm mb-4" style={{ color: 'hsl(157 10% 44%)' }}>
            Bring questions, candidates, and review work together in one calm workspace.
          </p>
          <Link to="/examiner/questions"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#007A62' }}>
            Open question bank <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total examinations', value: String(stats?.total_examinations ?? 0).padStart(2, '0'), icon: FileText, sub: `${stats?.published_examinations ?? 0} published` },
          { label: 'Responses to review', value: String(stats?.pending_grading ?? 0).padStart(2, '0'), icon: ClipboardList, sub: 'Awaiting manual grading' },
          { label: 'Question bank', value: String(stats?.total_questions ?? 0).padStart(2, '0'), icon: BookOpen, sub: 'Approved questions' },
        ].map((k) => (
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

      {/* Bottom row: quick actions + upcoming sessions */}
      <div className="grid lg:grid-cols-5 gap-5">
        {/* Quick actions */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'hsl(161 38% 13%)' }}>Quick actions</h3>
          {[
            { label: 'Question bank', desc: 'Add and review questions', href: '/examiner/questions', icon: BookOpen },
            { label: 'Live monitor', desc: 'Watch active sessions', href: '/examiner/monitor', icon: Radio },
            { label: 'Grading queue', desc: 'Review written responses', href: '/examiner/grading', icon: ClipboardList },
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

        {/* Upcoming sessions */}
        <div className="lg:col-span-3 n360-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'hsl(150 22% 86%)' }}>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'hsl(157 10% 44%)' }}>On the desk</p>
              <h3 className="text-sm font-semibold mt-0.5" style={{ color: 'hsl(161 38% 13%)' }}>Upcoming sessions</h3>
            </div>
            <Link to="/examiner/exams" className="text-xs font-medium flex items-center gap-1" style={{ color: '#007A62' }}>
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {(recentExams?.items.length ?? 0) === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: 'hsl(157 10% 44%)' }}>
              No examinations yet — create one to get started
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'hsl(150 22% 86%)' }}>
              {recentExams?.items.slice(0, 4).map((e) => (
                <li key={e.id}
                    onClick={() => navigate(`/examiner/exams/${e.id}`)}
                    className="px-5 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-green-50/50 transition-colors">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ background: 'hsl(155 24% 94%)' }}>
                    <FileText className="w-3.5 h-3.5" style={{ color: '#007A62' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'hsl(161 38% 13%)' }}>{e.title}</p>
                    <p className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>{e.total_marks} marks</p>
                  </div>
                  <span className={statusBadge(e.status)}>{statusLabel(e.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
