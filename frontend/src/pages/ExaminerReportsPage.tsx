import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '@/layouts/DashboardLayout'
import { dashboardService } from '@/services/dashboard'
import { TrendingUp, Download } from 'lucide-react'

export default function ExaminerReportsPage() {
  const { data: stats } = useQuery({
    queryKey: ['examiner-stats'],
    queryFn: dashboardService.examinerStats,
  })

  const totalExams = stats?.total_examinations ?? 0
  const published = stats?.published_examinations ?? 0
  const completionRate = totalExams > 0 ? Math.round((published / totalExams) * 100) : 0

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>Reports & insights</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(157 10% 44%)' }}>Make a careful read of examination outcomes.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#007A62' }}>
          <Download className="w-4 h-4" />
          Export report
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total examinations', value: String(totalExams).padStart(2, '0') },
          { label: 'Published', value: String(published).padStart(2, '0') },
          { label: 'Completion rate', value: `${completionRate}%` },
        ].map((s) => (
          <div key={s.label} className="n360-card p-5">
            <p className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>{s.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(161 38% 13%)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="n360-card p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'hsl(157 10% 44%)' }}>Insight</p>
            <h2 className="text-base font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>Candidate performance trend</h2>
          </div>
          <TrendingUp className="w-5 h-5" style={{ color: '#007A62' }} />
        </div>
        <div className="h-40 rounded-lg flex items-center justify-center" style={{ background: 'hsl(155 24% 94%)' }}>
          <p className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>
            Chart data will appear as results are published
          </p>
        </div>
      </div>

      {/* Export card */}
      <div className="n360-card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(155 24% 94%)' }}>
            <Download className="w-4 h-4" style={{ color: '#007A62' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>Examination outcomes · full report</p>
            <p className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>CSV format · all published results</p>
          </div>
        </div>
        <button className="text-sm font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors"
                style={{ borderColor: 'hsl(150 22% 86%)', color: 'hsl(161 38% 13%)' }}>
          <Download className="w-3.5 h-3.5" />
          Download CSV
        </button>
      </div>

      <p className="flex items-center gap-1.5 text-xs mt-4" style={{ color: 'hsl(157 10% 44%)' }}>
        <span className="w-3 h-3 rounded-full border-2 flex-shrink-0" style={{ borderColor: 'hsl(157 10% 44%)' }} />
        Report values reflect published and finalized results only
      </p>
    </DashboardLayout>
  )
}
