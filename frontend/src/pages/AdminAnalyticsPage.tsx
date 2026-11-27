import { useQuery } from '@tanstack/react-query'
import { Users, FileText, ClipboardList, TrendingUp } from 'lucide-react'
import axios from 'axios'
import DashboardLayout from '@/layouts/DashboardLayout'

const adminClient = axios.create({ baseURL: '/api/v1', withCredentials: true })

interface Analytics {
  user_by_role: { admin: number; examiner: number; candidate: number }
  exam_by_status: { DRAFT: number; PUBLISHED: number }
  attempt_stats: { total: number; submitted: number; in_progress: number }
  result_stats: { published: number; pass: number; fail: number }
  top_examiners: { examiner_name: string; exam_count: number; candidate_count: number }[]
}

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useQuery<Analytics>({
    queryKey: ['admin-analytics'],
    queryFn: () => adminClient.get('/dashboard/admin/analytics').then(r => r.data),
  })

  const passRate = data
    ? data.result_stats.pass + data.result_stats.fail > 0
      ? Math.round((data.result_stats.pass / (data.result_stats.pass + data.result_stats.fail)) * 100)
      : 0
    : 0

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>Platform analytics</h1>
        <p className="text-sm mt-1" style={{ color: 'hsl(157 10% 44%)' }}>Aggregated statistics across the entire platform.</p>
      </div>

      {isLoading && <div className="py-16 text-center text-sm" style={{ color: 'hsl(157 10% 44%)' }}>Loading analytics…</div>}

      {data && (
        <div className="space-y-6">
          {/* Users by role */}
          <section>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'hsl(161 38% 13%)' }}>User distribution</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Administrators', value: data.user_by_role.admin, icon: Users, color: 'bg-purple-100 text-purple-700' },
                { label: 'Examiners', value: data.user_by_role.examiner, icon: FileText, color: 'bg-blue-100 text-blue-700' },
                { label: 'Candidates', value: data.user_by_role.candidate, icon: Users, color: 'bg-green-100 text-green-700' },
                { label: 'Overall pass rate', value: `${passRate}%`, icon: TrendingUp, color: 'bg-amber-100 text-amber-700' },
              ].map(k => (
                <div key={k.label} className="n360-card p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>{k.label}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${k.color}`}>
                      <k.icon className="w-3 h-3 inline" />
                    </span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>{k.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Exam + attempt stats */}
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="n360-card p-5">
              <p className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'hsl(157 10% 44%)' }}>Examinations</p>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'hsl(161 38% 13%)' }}>By status</h3>
              <div className="space-y-3">
                {[
                  { label: 'Draft', value: data.exam_by_status.DRAFT, color: '#f59e0b' },
                  { label: 'Published', value: data.exam_by_status.PUBLISHED, color: '#007A62' },
                ].map(r => {
                  const total = data.exam_by_status.DRAFT + data.exam_by_status.PUBLISHED
                  const pct = total > 0 ? Math.round((r.value / total) * 100) : 0
                  return (
                    <div key={r.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: 'hsl(161 38% 13%)' }}>{r.label}</span>
                        <span style={{ color: 'hsl(157 10% 44%)' }}>{r.value} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'hsl(155 24% 94%)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: r.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="n360-card p-5">
              <p className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'hsl(157 10% 44%)' }}>Attempts</p>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'hsl(161 38% 13%)' }}>Submission status</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total attempts', value: data.attempt_stats.total },
                  { label: 'Submitted', value: data.attempt_stats.submitted },
                  { label: 'In progress', value: data.attempt_stats.in_progress },
                  { label: 'Results published', value: data.result_stats.published },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-sm py-1 border-b last:border-0"
                       style={{ borderColor: 'hsl(150 22% 86%)' }}>
                    <span style={{ color: 'hsl(157 10% 44%)' }}>{r.label}</span>
                    <span className="font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top examiners */}
          <div className="n360-card overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(150 22% 86%)' }}>
              <p className="text-[9px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'hsl(157 10% 44%)' }}>Leaderboard</p>
              <h3 className="text-sm font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>Top examiners by exam count</h3>
            </div>
            {data.top_examiners.length === 0 ? (
              <div className="py-10 text-center text-sm" style={{ color: 'hsl(157 10% 44%)' }}>No examiner data yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead style={{ background: 'hsl(155 24% 97%)' }}>
                  <tr className="text-left">
                    <th className="px-5 py-3 text-xs font-semibold" style={{ color: 'hsl(157 10% 44%)' }}>#</th>
                    <th className="px-5 py-3 text-xs font-semibold" style={{ color: 'hsl(157 10% 44%)' }}>Examiner</th>
                    <th className="px-5 py-3 text-xs font-semibold text-center" style={{ color: 'hsl(157 10% 44%)' }}>Exams</th>
                    <th className="px-5 py-3 text-xs font-semibold text-center" style={{ color: 'hsl(157 10% 44%)' }}>Candidates</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'hsl(150 22% 86%)' }}>
                  {data.top_examiners.map((e, i) => (
                    <tr key={e.examiner_name} className="hover:bg-green-50/40 transition-colors">
                      <td className="px-5 py-3 text-xs font-mono" style={{ color: 'hsl(157 10% 44%)' }}>{i + 1}</td>
                      <td className="px-5 py-3 font-medium" style={{ color: 'hsl(161 38% 13%)' }}>{e.examiner_name}</td>
                      <td className="px-5 py-3 text-center" style={{ color: 'hsl(161 38% 13%)' }}>{e.exam_count}</td>
                      <td className="px-5 py-3 text-center" style={{ color: 'hsl(161 38% 13%)' }}>{e.candidate_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
