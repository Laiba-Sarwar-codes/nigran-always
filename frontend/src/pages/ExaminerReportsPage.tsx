import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '@/layouts/DashboardLayout'
import { dashboardService } from '@/services/dashboard'
import { TrendingUp, Download, Users, CheckCircle, XCircle, FileText } from 'lucide-react'
import axios from 'axios'

const analyticsClient = axios.create({ baseURL: '/api/v1', withCredentials: true })

interface ExamAnalytic {
  id: number
  title: string
  status: string
  enrolled: number
  submitted: number
  passes: number
  fails: number
  avg_percentage: number | null
}

function PassBar({ passes, fails }: { passes: number; fails: number }) {
  const total = passes + fails
  if (total === 0) return <span className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>No results yet</span>
  const pct = Math.round((passes / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'hsl(155 24% 94%)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#007A62' }} />
      </div>
      <span className="text-xs font-semibold w-9 text-right" style={{ color: 'hsl(161 38% 13%)' }}>{pct}%</span>
    </div>
  )
}

function downloadCSV(items: ExamAnalytic[]) {
  const rows = [
    ['Examination', 'Status', 'Enrolled', 'Submitted', 'Passes', 'Fails', 'Pass Rate %', 'Avg Score %'],
    ...items.map(e => [
      `"${e.title.replace(/"/g, '""')}"`,
      e.status,
      e.enrolled,
      e.submitted,
      e.passes,
      e.fails,
      e.passes + e.fails > 0 ? Math.round((e.passes / (e.passes + e.fails)) * 100) : '',
      e.avg_percentage ?? '',
    ]),
  ]
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'nigran360-report.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExaminerReportsPage() {
  const { data: stats } = useQuery({
    queryKey: ['examiner-stats'],
    queryFn: dashboardService.examinerStats,
  })

  const { data: analytics, isLoading } = useQuery<{ items: ExamAnalytic[] }>({
    queryKey: ['examiner-analytics'],
    queryFn: () => analyticsClient.get('/dashboard/examiner/analytics').then(r => r.data),
  })

  const items = analytics?.items ?? []
  const totalEnrolled = items.reduce((s, e) => s + e.enrolled, 0)
  const totalSubmitted = items.reduce((s, e) => s + e.submitted, 0)
  const totalPasses = items.reduce((s, e) => s + e.passes, 0)
  const totalFails = items.reduce((s, e) => s + e.fails, 0)
  const overallPassRate = totalPasses + totalFails > 0
    ? Math.round((totalPasses / (totalPasses + totalFails)) * 100)
    : 0

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>Reports & insights</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(157 10% 44%)' }}>Make a careful read of examination outcomes.</p>
        </div>
        <button
          onClick={() => items.length && downloadCSV(items)}
          disabled={!items.length}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
          style={{ background: '#007A62' }}>
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total exams', value: String(stats?.total_examinations ?? 0).padStart(2, '0'), icon: FileText },
          { label: 'Enrolled candidates', value: String(totalEnrolled).padStart(2, '0'), icon: Users },
          { label: 'Submissions', value: String(totalSubmitted).padStart(2, '0'), icon: CheckCircle },
          { label: 'Overall pass rate', value: `${overallPassRate}%`, icon: TrendingUp },
        ].map((s) => (
          <div key={s.label} className="n360-card p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>{s.label}</p>
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'hsl(155 24% 94%)' }}>
                <s.icon className="w-3 h-3" style={{ color: '#007A62' }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Per-exam breakdown */}
      <div className="n360-card overflow-hidden">
        <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(150 22% 86%)' }}>
          <p className="text-[9px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'hsl(157 10% 44%)' }}>Breakdown</p>
          <h2 className="text-base font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>Per-examination outcomes</h2>
        </div>

        {isLoading && (
          <div className="py-12 text-center text-sm" style={{ color: 'hsl(157 10% 44%)' }}>Loading analytics…</div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="py-16 text-center text-sm" style={{ color: 'hsl(157 10% 44%)' }}>
            No examinations found. Create and publish an exam to see analytics here.
          </div>
        )}

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: 'hsl(155 24% 97%)' }}>
                <tr className="text-left">
                  <th className="px-5 py-3 text-xs font-semibold" style={{ color: 'hsl(157 10% 44%)' }}>Examination</th>
                  <th className="px-5 py-3 text-xs font-semibold" style={{ color: 'hsl(157 10% 44%)' }}>Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-center" style={{ color: 'hsl(157 10% 44%)' }}>Enrolled</th>
                  <th className="px-5 py-3 text-xs font-semibold text-center" style={{ color: 'hsl(157 10% 44%)' }}>Submitted</th>
                  <th className="px-5 py-3 text-xs font-semibold text-center" style={{ color: 'hsl(157 10% 44%)' }}>P / F</th>
                  <th className="px-5 py-3 text-xs font-semibold" style={{ color: 'hsl(157 10% 44%)' }}>Pass rate</th>
                  <th className="px-5 py-3 text-xs font-semibold text-center" style={{ color: 'hsl(157 10% 44%)' }}>Avg score</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'hsl(150 22% 86%)' }}>
                {items.map(e => (
                  <tr key={e.id} className="hover:bg-green-50/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-sm truncate max-w-xs" style={{ color: 'hsl(161 38% 13%)' }}>{e.title}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        e.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>{e.status}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-sm" style={{ color: 'hsl(161 38% 13%)' }}>
                      <span className="inline-flex items-center gap-1"><Users className="w-3 h-3 opacity-50" />{e.enrolled}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-sm" style={{ color: 'hsl(161 38% 13%)' }}>{e.submitted}</td>
                    <td className="px-5 py-3.5 text-center text-sm">
                      <span className="text-green-700 font-medium">{e.passes}</span>
                      <span style={{ color: 'hsl(157 10% 44%)' }}> / </span>
                      <span className="text-red-600 font-medium">{e.fails}</span>
                    </td>
                    <td className="px-5 py-3.5 min-w-[140px]">
                      <PassBar passes={e.passes} fails={e.fails} />
                    </td>
                    <td className="px-5 py-3.5 text-center text-sm font-medium" style={{ color: 'hsl(161 38% 13%)' }}>
                      {e.avg_percentage != null ? `${e.avg_percentage}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-xs mt-4" style={{ color: 'hsl(157 10% 44%)' }}>
        <XCircle className="w-3 h-3 opacity-50" />
        Pass rate and avg score reflect published results only
      </p>
    </DashboardLayout>
  )
}
