import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import DashboardLayout from '@/layouts/DashboardLayout'
import StatCard from '@/components/ui/StatCard'
import EmptyState from '@/components/common/EmptyState'
import LoadingState from '@/components/common/LoadingState'
import ErrorState from '@/components/common/ErrorState'
import { dashboardService } from '@/services/dashboard'
import { getCandidateResults } from '@/services/grading'
import { useAuth } from '@/hooks/useAuth'
import { FileText, Clock, CheckSquare, BarChart3, ChevronRight } from 'lucide-react'

function statusBadge(status: string) {
  const map: Record<string, string> = {
    PUBLISHED: 'bg-green-100 text-green-700',
    DRAFT: 'bg-secondary text-muted-foreground',
    CLOSED: 'bg-amber-100 text-amber-700',
  }
  return map[status] ?? 'bg-secondary text-muted-foreground'
}

export default function CandidateDashboardPage() {
  const { user } = useAuth()
  const { data: summary, isLoading, isError, refetch } = useQuery({
    queryKey: ['candidate-summary'],
    queryFn: dashboardService.candidateSummary,
  })
  const { data: recentExams } = useQuery({
    queryKey: ['candidate-recent-exams'],
    queryFn: dashboardService.candidateRecentExams,
  })
  const { data: results } = useQuery({
    queryKey: ['candidate-results'],
    queryFn: getCandidateResults,
  })

  const examItems = (recentExams?.items ?? []) as {
    id: number; title: string; status: string; enrolled_at: string
  }[]
  const resultItems = results ?? []

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {user?.full_name ? `Welcome, ${user.full_name.split(' ')[0]}` : 'My Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your examinations and results</p>
        </div>

        {isLoading ? (
          <LoadingState message="Loading your data…" />
        ) : isError ? (
          <ErrorState retry={refetch} />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Assigned" value={summary?.assigned_examinations ?? 0} icon={FileText} color="blue" />
            <StatCard title="Upcoming" value={summary?.upcoming_examinations ?? 0} icon={Clock} color="amber" />
            <StatCard title="Completed" value={summary?.completed_examinations ?? 0} icon={CheckSquare} color="green" />
            <StatCard title="Results" value={summary?.published_results ?? 0} icon={BarChart3} color="purple" />
          </div>
        )}

        {/* My Examinations */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm">My Examinations</h3>
            <Link to="/candidate/exams" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {examItems.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No examinations assigned"
              description="Examinations assigned to you by your examiner will appear here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {examItems.slice(0, 5).map((exam) => (
                <li key={exam.id} className="px-5 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{exam.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enrolled {new Date(exam.enrolled_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`ml-3 flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(exam.status)}`}>
                    {exam.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Published Results */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm">Published Results</h3>
            <Link to="/candidate/results" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {resultItems.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No results published yet"
              description="Your examination results will appear here once published by your examiner."
            />
          ) : (
            <ul className="divide-y divide-border">
              {resultItems.slice(0, 5).map((r) => (
                  <li key={r.result_id} className="px-5 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.exam_title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.obtained_marks} / {r.total_marks} marks · {r.percentage}%
                      </p>
                    </div>
                    <span className={`ml-3 flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${r.result_status === 'PASS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {r.result_status}
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
