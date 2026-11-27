import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import axios from 'axios'
import DashboardLayout from '@/layouts/DashboardLayout'

const adminClient = axios.create({ baseURL: '/api/v1', withCredentials: true })

interface AdminExam {
  id: number
  title: string
  status: string
  total_marks: number
  passing_marks: number
  duration_minutes: number | null
  creator_name: string
  creator_email: string
  question_count: number
  updated_at: string | null
}

interface ExamListResponse {
  items: AdminExam[]
  total: number
  page: number
  page_size: number
}

export default function AdminExamsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading, isError } = useQuery<ExamListResponse>({
    queryKey: ['admin-exams', page, debouncedSearch, statusFilter],
    queryFn: () => adminClient.get('/admin/exams', {
      params: {
        page,
        page_size: 20,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
      },
    }).then(r => r.data),
  })

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1

  const handleSearch = (v: string) => {
    setSearch(v)
    clearTimeout((window as unknown as { _ast?: ReturnType<typeof setTimeout> })._ast)
    ;(window as unknown as { _ast?: ReturnType<typeof setTimeout> })._ast = setTimeout(() => {
      setDebouncedSearch(v)
      setPage(1)
    }, 400)
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>All examinations</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(157 10% 44%)' }}>Platform-wide view of all examinations across examiners.</p>
        </div>
      </div>

      <div className="n360-card overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between"
             style={{ borderColor: 'hsl(150 22% 86%)' }}>
          <div className="flex items-center gap-2">
            {['', 'DRAFT', 'PUBLISHED'].map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  statusFilter === s
                    ? 'text-white border-transparent'
                    : 'hover:bg-green-50'
                }`}
                style={statusFilter === s
                  ? { background: '#007A62', borderColor: '#007A62' }
                  : { borderColor: 'hsl(150 22% 86%)', color: 'hsl(157 10% 44%)' }}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'hsl(157 10% 44%)' }} />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search examinations…"
              className="pl-8 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none"
              style={{ borderColor: 'hsl(150 22% 86%)' }}
            />
          </div>
        </div>

        {isLoading && <div className="py-12 text-center text-sm" style={{ color: 'hsl(157 10% 44%)' }}>Loading…</div>}
        {isError && <div className="py-12 text-center text-sm text-red-600">Failed to load examinations</div>}

        {!isLoading && !isError && (data?.items.length ?? 0) === 0 && (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: 'hsl(157 10% 44%)' }} />
            <p className="text-sm" style={{ color: 'hsl(157 10% 44%)' }}>No examinations found</p>
          </div>
        )}

        {(data?.items.length ?? 0) > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: 'hsl(155 24% 97%)' }}>
                <tr className="text-left border-b" style={{ borderColor: 'hsl(150 22% 86%)' }}>
                  <th className="px-5 py-3 text-xs font-semibold" style={{ color: 'hsl(157 10% 44%)' }}>Title</th>
                  <th className="px-5 py-3 text-xs font-semibold" style={{ color: 'hsl(157 10% 44%)' }}>Examiner</th>
                  <th className="px-5 py-3 text-xs font-semibold" style={{ color: 'hsl(157 10% 44%)' }}>Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-center" style={{ color: 'hsl(157 10% 44%)' }}>Qs</th>
                  <th className="px-5 py-3 text-xs font-semibold text-center" style={{ color: 'hsl(157 10% 44%)' }}>Marks</th>
                  <th className="px-5 py-3 text-xs font-semibold text-center" style={{ color: 'hsl(157 10% 44%)' }}>Duration</th>
                  <th className="px-5 py-3 text-xs font-semibold" style={{ color: 'hsl(157 10% 44%)' }}>Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'hsl(150 22% 86%)' }}>
                {data?.items.map(e => (
                  <tr key={e.id} className="hover:bg-green-50/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium truncate max-w-xs" style={{ color: 'hsl(161 38% 13%)' }}>{e.title}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm" style={{ color: 'hsl(161 38% 13%)' }}>{e.creator_name}</p>
                      <p className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>{e.creator_email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        e.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>{e.status}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-sm" style={{ color: 'hsl(161 38% 13%)' }}>{e.question_count}</td>
                    <td className="px-5 py-3.5 text-center text-sm" style={{ color: 'hsl(161 38% 13%)' }}>{e.total_marks}</td>
                    <td className="px-5 py-3.5 text-center text-sm" style={{ color: 'hsl(157 10% 44%)' }}>
                      {e.duration_minutes ? `${e.duration_minutes}m` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: 'hsl(157 10% 44%)' }}>
                      {e.updated_at ? new Date(e.updated_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-5 py-3 border-t flex items-center justify-between text-xs"
             style={{ borderColor: 'hsl(150 22% 86%)', color: 'hsl(157 10% 44%)' }}>
          <span>{data?.total ?? 0} examinations</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                      className="p-1 rounded border disabled:opacity-40 hover:bg-green-50 transition-colors"
                      style={{ borderColor: 'hsl(150 22% 86%)' }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                      className="p-1 rounded border disabled:opacity-40 hover:bg-green-50 transition-colors"
                      style={{ borderColor: 'hsl(150 22% 86%)' }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
