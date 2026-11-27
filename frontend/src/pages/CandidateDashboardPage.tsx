import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '@/layouts/DashboardLayout'
import StatCard from '@/components/ui/StatCard'
import EmptyState from '@/components/common/EmptyState'
import LoadingState from '@/components/common/LoadingState'
import ErrorState from '@/components/common/ErrorState'
import { dashboardService } from '@/services/dashboard'
import { FileText, Clock, CheckSquare, BarChart3 } from 'lucide-react'

export default function CandidateDashboardPage() {
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
    queryFn: dashboardService.candidateResults,
  })

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Dashboard</h1>
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
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">My Examinations</h3>
          </div>
          {(recentExams?.items.length ?? 0) === 0 ? (
            <EmptyState
              icon={FileText}
              title="No examinations assigned"
              description="Examinations assigned to you will appear here once available in Phase 5."
            />
          ) : null}
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Published Results</h3>
          </div>
          {(results?.items.length ?? 0) === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No results published yet"
              description="Your published examination results will appear here."
            />
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  )
}
