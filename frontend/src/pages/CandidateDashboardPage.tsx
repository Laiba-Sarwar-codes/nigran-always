import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '@/layouts/DashboardLayout'
import { dashboardService } from '@/services/dashboard'
import { getCandidateResults } from '@/services/grading'
import { useAuth } from '@/hooks/useAuth'
import { Calendar, FileText, CheckCircle2, ArrowRight, TrendingUp } from 'lucide-react'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function CandidateDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: summary } = useQuery({ queryKey: ['candidate-summary'], queryFn: dashboardService.candidateSummary })
  const { data: recentExams } = useQuery({ queryKey: ['candidate-recent-exams'], queryFn: dashboardService.candidateRecentExams })
  const { data: results } = useQuery({ queryKey: ['candidate-results'], queryFn: getCandidateResults })

  const firstName = user?.full_name?.split(' ')[0] ?? 'there'
  const examItems = (recentExams?.items ?? []) as { id: number; title: string; status: string; enrolled_at: string }[]
  const resultItems = results ?? []
  const nextExam = examItems.find(e => e.status === 'PUBLISHED')

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
        {nextExam && (
          <button onClick={() => navigate(`/candidate/exam/${nextExam.id}`)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white self-start"
                  style={{ background: '#007A62' }}>
            Enter exam <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Hero banner */}
      <div className="n360-card p-6 mb-6 relative overflow-hidden">
        <div className="relative z-10 max-w-sm">
          <p className="text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#007A62' }}>
            ● Your Assessment Space
          </p>
          <h2 className="text-xl font-bold leading-snug mb-2" style={{ color: 'hsl(161 38% 13%)' }}>
            Your next step starts here.
          </h2>
          <p className="text-sm mb-4" style={{ color: 'hsl(157 10% 44%)' }}>
            Everything you need for the next assessment, with room to focus.
          </p>
          <Link to="/candidate/exams"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#007A62' }}>
            View upcoming exams <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Upcoming assessments', value: String(summary?.upcoming_examinations ?? 0).padStart(2, '0'), icon: Calendar, sub: 'Scheduled ahead' },
          { label: 'In progress', value: String(summary?.assigned_examinations ?? 0).padStart(2, '0'), icon: FileText, sub: 'Assigned to you' },
          { label: 'Completed', value: String(summary?.completed_examinations ?? 0).padStart(2, '0'), icon: CheckCircle2, sub: 'This period' },
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

      {/* Bottom row: next exam + progress */}
      <div className="grid lg:grid-cols-5 gap-5">
        {/* Next exam card */}
        <div className="lg:col-span-3 n360-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'hsl(150 22% 86%)' }}>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'hsl(157 10% 44%)' }}>Up next</p>
              <h3 className="text-sm font-semibold mt-0.5" style={{ color: 'hsl(161 38% 13%)' }}>My examinations</h3>
            </div>
            <Link to="/candidate/exams" className="text-xs font-medium flex items-center gap-1" style={{ color: '#007A62' }}>
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {examItems.length === 0 ? (
            <div className="py-10 text-center text-sm" style={{ color: 'hsl(157 10% 44%)' }}>
              No examinations assigned yet
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'hsl(150 22% 86%)' }}>
              {examItems.slice(0, 4).map((e) => (
                <li key={e.id}
                    onClick={() => e.status === 'PUBLISHED' && navigate(`/candidate/exam/${e.id}`)}
                    className="px-5 py-3.5 flex items-center gap-3 hover:bg-green-50/50 transition-colors"
                    style={{ cursor: e.status === 'PUBLISHED' ? 'pointer' : 'default' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                       style={{ background: 'hsl(155 24% 94%)' }}>
                    <FileText className="w-3.5 h-3.5" style={{ color: '#007A62' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'hsl(161 38% 13%)' }}>{e.title}</p>
                    <p className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>
                      Enrolled {new Date(e.enrolled_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={e.status === 'PUBLISHED' ? 'badge badge-live' : 'badge badge-upcoming'}>
                    {e.status === 'PUBLISHED' ? 'Open' : 'Upcoming'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Progress / results */}
        <div className="lg:col-span-2 n360-card overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(150 22% 86%)' }}>
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'hsl(157 10% 44%)' }}>This term</p>
            <h3 className="text-sm font-semibold mt-0.5" style={{ color: 'hsl(161 38% 13%)' }}>Your progress</h3>
          </div>
          {resultItems.length === 0 ? (
            <div className="p-6">
              <TrendingUp className="w-8 h-8 mb-3" style={{ color: 'hsl(157 10% 44%)' }} />
              <p className="text-sm" style={{ color: 'hsl(157 10% 44%)' }}>Results will appear here once published</p>
              <Link to="/candidate/results" className="text-xs font-medium mt-2 inline-flex items-center gap-1" style={{ color: '#007A62' }}>
                See performance summary <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="p-5">
              {(() => {
                const avg = Math.round(resultItems.reduce((s, r) => s + r.percentage, 0) / resultItems.length)
                return (
                  <>
                    <div className="flex items-end gap-1 mb-2">
                      <span className="text-3xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>{avg}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full mb-3" style={{ background: 'hsl(155 24% 94%)' }}>
                      <div className="h-2 rounded-full transition-all" style={{ width: `${avg}%`, background: '#007A62' }} />
                    </div>
                    <p className="text-xs mb-1" style={{ color: 'hsl(157 10% 44%)' }}>
                      {resultItems.length} assessment{resultItems.length !== 1 ? 's' : ''} completed
                    </p>
                    <Link to="/candidate/results" className="text-xs font-medium flex items-center gap-1" style={{ color: '#007A62' }}>
                      See performance summary <ArrowRight className="w-3 h-3" />
                    </Link>
                  </>
                )
              })()}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
