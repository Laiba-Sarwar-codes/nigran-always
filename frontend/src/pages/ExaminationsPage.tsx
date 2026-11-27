import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, BookOpen, Clock, Award, ChevronRight } from 'lucide-react'
import { examsService } from '@/services/exam'
import DashboardLayout from '@/layouts/DashboardLayout'
import LoadingState from '@/components/common/LoadingState'
import ErrorState from '@/components/common/ErrorState'
import CreateExamModal from '@/components/exam/CreateExamModal'
import { useAuth } from '@/hooks/useAuth'

const TABS = ['All examinations', 'Live', 'Upcoming', 'Draft'] as const
type Tab = typeof TABS[number]

function statusClass(status: string) {
  if (status === 'PUBLISHED') return 'badge badge-live'
  if (status === 'DRAFT') return 'badge badge-draft'
  return 'badge badge-upcoming'
}
function statusLabel(status: string) {
  if (status === 'PUBLISHED') return 'Live'
  if (status === 'DRAFT') return 'Draft'
  return status
}

export default function ExaminationsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
const isAdmin = user?.role === 'ADMIN'
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState<Tab>('All examinations')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['exams', page],
    queryFn: () => examsService.list({ page, per_page: 20 }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => examsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  })

  const examPath = (id: number) =>
    isAdmin ? `/admin/exams/${id}` : `/examiner/exams/${id}`

  const filtered = (data?.items ?? []).filter(e => {
    if (tab === 'Live') return e.status === 'PUBLISHED'
    if (tab === 'Draft') return e.status === 'DRAFT'
    if (tab === 'Upcoming') return e.status !== 'PUBLISHED' && e.status !== 'DRAFT'
    return true
  })

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>Examinations</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(157 10% 44%)' }}>Plan, monitor, and review every assessment.</p>
        </div>
        {!isAdmin && (
          <button onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white self-start"
                  style={{ background: '#007A62' }}>
            <Plus className="w-4 h-4" />
            New examination
          </button>
        )}
      </div>

      {/* Tab bar + table card */}
      <div className="n360-card overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b" style={{ borderColor: 'hsl(150 22% 86%)' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
                    className="px-3 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2"
                    style={{
                      color: tab === t ? '#007A62' : 'hsl(157 10% 44%)',
                      borderBottomColor: tab === t ? '#007A62' : 'transparent',
                    }}>
              {t}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 pb-2">
            {!isAdmin && (
              <button onClick={() => setShowCreate(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
                      style={{ background: '#007A62' }}>
                <Plus className="w-3.5 h-3.5" /> New examination
              </button>
            )}
          </div>
        </div>

        {isLoading && <div className="p-10"><LoadingState /></div>}
        {isError && <div className="p-10"><ErrorState /></div>}

        {!isLoading && !isError && (
          <>
            {/* Table header */}
            <div className="grid grid-cols-12 px-5 py-3 text-xs font-semibold uppercase tracking-wide border-b"
                 style={{ color: 'hsl(157 10% 44%)', borderColor: 'hsl(150 22% 86%)' }}>
              <span className="col-span-5">Examination</span>
              <span className="col-span-3">Questions / Marks</span>
              <span className="col-span-2">Duration</span>
              <span className="col-span-2">Status</span>
            </div>

            {filtered.length === 0 && (
              <div className="py-16 text-center text-sm" style={{ color: 'hsl(157 10% 44%)' }}>
                No examinations in this category
              </div>
            )}

            <ul className="divide-y" style={{ borderColor: 'hsl(150 22% 86%)' }}>
              {filtered.map(exam => (
                <li key={exam.id}
                    onClick={() => navigate(examPath(exam.id))}
                    className="grid grid-cols-12 items-center px-5 py-4 cursor-pointer hover:bg-green-50/50 transition-colors group">
                  <div className="col-span-5 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'hsl(161 38% 13%)' }}>{exam.title}</p>
                    {exam.description && (
                      <p className="text-xs truncate mt-0.5" style={{ color: 'hsl(157 10% 44%)' }}>{exam.description}</p>
                    )}
                  </div>
                  <div className="col-span-3 flex items-center gap-3 text-sm" style={{ color: 'hsl(157 10% 44%)' }}>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> {exam.exam_questions.length}q
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3 h-3" /> {exam.total_marks}m
                    </span>
                  </div>
                  <div className="col-span-2 text-sm flex items-center gap-1" style={{ color: 'hsl(157 10% 44%)' }}>
                    <Clock className="w-3 h-3" />
                    {exam.duration_minutes ? `${exam.duration_minutes} min` : '—'}
                  </div>
                  <div className="col-span-2 flex items-center justify-between">
                    <span className={statusClass(exam.status)}>{statusLabel(exam.status)}</span>
                    <div className="flex items-center gap-1">
                      {exam.status === 'DRAFT' && !isAdmin && (
                        <button onClick={e => { e.stopPropagation(); if (confirm('Delete?')) deleteMut.mutate(exam.id) }}
                                className="p-1 rounded hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4" style={{ color: 'hsl(157 10% 44%)' }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Footer */}
            <div className="px-5 py-3 border-t flex items-center justify-between text-xs"
                 style={{ borderColor: 'hsl(150 22% 86%)', color: 'hsl(157 10% 44%)' }}>
              <span>Showing {filtered.length} examination{filtered.length !== 1 ? 's' : ''}</span>
              {data && data.pages > 1 && (
                <div className="flex items-center gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                          className="px-2.5 py-1 rounded border disabled:opacity-40 transition-colors hover:bg-green-50"
                          style={{ borderColor: 'hsl(150 22% 86%)' }}>Prev</button>
                  <span>{page} / {data.pages}</span>
                  <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)}
                          className="px-2.5 py-1 rounded border disabled:opacity-40 transition-colors hover:bg-green-50"
                          style={{ borderColor: 'hsl(150 22% 86%)' }}>Next</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showCreate && (
        <CreateExamModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            qc.invalidateQueries({ queryKey: ['exams'] })
            setShowCreate(false)
            navigate(`/examiner/exams/${id}`)
          }}
        />
      )}
    </DashboardLayout>
  )
}
