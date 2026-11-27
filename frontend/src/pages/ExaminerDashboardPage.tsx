import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '@/layouts/DashboardLayout'
import StatCard from '@/components/ui/StatCard'
import EmptyState from '@/components/common/EmptyState'
import LoadingState from '@/components/common/LoadingState'
import ErrorState from '@/components/common/ErrorState'
import { dashboardService } from '@/services/dashboard'
import { FileText, BookOpen, Users, CheckSquare, Clock, Plus } from 'lucide-react'

const STATUS_COLORS = {
  DRAFT: 'bg-amber-100 text-amber-700',
  PUBLISHED: 'bg-green-100 text-green-700',
}

export default function ExaminerDashboardPage() {
  const navigate = useNavigate()
  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['examiner-stats'],
    queryFn: dashboardService.examinerStats,
  })
  const { data: recentExams } = useQuery({
    queryKey: ['examiner-recent-exams'],
    queryFn: dashboardService.examinerRecentExams,
  })

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Examiner Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your examinations and question bank</p>
        </div>

        {isLoading ? (
          <LoadingState message="Loading stats…" />
        ) : isError ? (
          <ErrorState retry={refetch} />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Exams" value={stats?.total_examinations ?? 0} icon={FileText} color="blue" />
            <StatCard title="Published" value={stats?.published_examinations ?? 0} icon={CheckSquare} color="green" />
            <StatCard title="Drafts" value={stats?.draft_examinations ?? 0} icon={Clock} color="amber" />
            <StatCard title="Questions" value={stats?.total_questions ?? 0} icon={BookOpen} color="purple" />
          </div>
        )}

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/examiner/exams')}
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-border hover:border-primary/40 hover:shadow-sm transition-all text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plus className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Create Examination</p>
                <p className="text-xs text-muted-foreground">Build and publish a new exam</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/examiner/questions')}
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-border hover:border-primary/40 hover:shadow-sm transition-all text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Question Bank</p>
                <p className="text-xs text-muted-foreground">Manage reusable questions</p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent examinations */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Recent Examinations</h3>
            <button
              onClick={() => navigate('/examiner/exams')}
              className="text-xs text-primary hover:underline"
            >
              View all
            </button>
          </div>
          {(recentExams?.items.length ?? 0) === 0 ? (
            <EmptyState
              icon={FileText}
              title="No examinations yet"
              description="Create your first examination from the Examinations page."
            />
          ) : (
            <div className="divide-y divide-border">
              {recentExams?.items.map((e: { id: number; title: string; status: string; total_marks: number; updated_at: string }) => (
                <div
                  key={e.id}
                  onClick={() => navigate(`/examiner/exams/${e.id}`)}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/40 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{e.total_marks} marks</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[e.status as 'DRAFT' | 'PUBLISHED']}`}>
                    {e.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
