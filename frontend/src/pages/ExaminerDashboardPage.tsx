import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '@/layouts/DashboardLayout'
import StatCard from '@/components/ui/StatCard'
import EmptyState from '@/components/common/EmptyState'
import LoadingState from '@/components/common/LoadingState'
import ErrorState from '@/components/common/ErrorState'
import { dashboardService } from '@/services/dashboard'
import { FileText, BookOpen, Users, CheckSquare, Clock } from 'lucide-react'

export default function ExaminerDashboardPage() {
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
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title="Total Examinations" value={stats?.total_examinations ?? 0} icon={FileText} color="blue" />
            <StatCard title="Published" value={stats?.published_examinations ?? 0} icon={CheckSquare} color="green" />
            <StatCard title="Drafts" value={stats?.draft_examinations ?? 0} icon={Clock} color="amber" />
            <StatCard title="Enrolled Candidates" value={stats?.enrolled_candidates ?? 0} icon={Users} color="purple" />
            <StatCard title="Completed" value={stats?.completed_examinations ?? 0} icon={CheckSquare} color="green" />
          </div>
        )}

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-border border-dashed opacity-60 cursor-not-allowed">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Create Examination</p>
                <p className="text-xs text-muted-foreground">Available in Phase 4</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-border border-dashed opacity-60 cursor-not-allowed">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Question Bank</p>
                <p className="text-xs text-muted-foreground">Available in Phase 4</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent examinations */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Recent Examinations</h3>
          </div>
          {(recentExams?.items.length ?? 0) === 0 ? (
            <EmptyState
              icon={FileText}
              title="No examinations yet"
              description="Examination creation will be available in Phase 4."
            />
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  )
}
