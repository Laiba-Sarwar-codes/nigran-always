import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2, Edit2, ChevronLeft, ChevronRight } from 'lucide-react'
import { questionsService } from '@/services/exam'
import type { Question, QuestionType } from '@/types/exam'
import DashboardLayout from '@/layouts/DashboardLayout'
import QuestionFormModal from '@/components/exam/QuestionFormModal'

const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: 'Single Choice',
  MULTIPLE_CHOICE: 'Multiple Choice',
  WRITTEN: 'Written Response',
}

export default function QuestionBankPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Question | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['questions', page, debouncedSearch],
    queryFn: () => questionsService.list({ page, per_page: 15, q: debouncedSearch || undefined }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => questionsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  })

  const handleSearchChange = (v: string) => {
    setSearch(v)
    clearTimeout((window as unknown as { _sqt?: ReturnType<typeof setTimeout> })._sqt)
    ;(window as unknown as { _sqt?: ReturnType<typeof setTimeout> })._sqt = setTimeout(() => {
      setDebouncedSearch(v)
      setPage(1)
    }, 400)
  }

  const openEdit = (q: Question) => { setEditing(q); setShowModal(true) }
  const openCreate = () => { setEditing(null); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null) }

  const typeClass: Record<string, string> = {
    SINGLE_CHOICE: 'badge bg-blue-100 text-blue-700',
    MULTIPLE_CHOICE: 'badge bg-purple-100 text-purple-700',
    WRITTEN: 'badge badge-upcoming',
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>Question bank</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(157 10% 44%)' }}>A considered library of reviewed assessment items.</p>
        </div>
        <button onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white self-start"
                style={{ background: '#007A62' }}>
          <Plus className="w-4 h-4" /> Add question
        </button>
      </div>

      <div className="n360-card overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b flex items-center justify-between gap-3" style={{ borderColor: 'hsl(150 22% 86%)' }}>
          <p className="text-sm font-medium" style={{ color: 'hsl(161 38% 13%)' }}>
            <span className="font-bold">{data?.total ?? '—'}</span>
            <span style={{ color: 'hsl(157 10% 44%)' }}> reviewed questions</span>
          </p>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'hsl(157 10% 44%)' }} />
            <input value={search} onChange={e => handleSearchChange(e.target.value)}
                   placeholder="Search questions…"
                   className="pl-8 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none"
                   style={{ borderColor: 'hsl(150 22% 86%)' }} />
          </div>
        </div>

        {isLoading && <div className="py-12 text-center text-sm" style={{ color: 'hsl(157 10% 44%)' }}>Loading…</div>}
        {isError && <div className="py-12 text-center text-sm text-red-600">Failed to load questions</div>}

        {data && data.items.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm mb-3" style={{ color: 'hsl(157 10% 44%)' }}>No questions yet — add your first item</p>
            <button onClick={openCreate} className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ background: '#007A62' }}>Add question</button>
          </div>
        )}

        {data && data.items.length > 0 && (
          <>
            <ul className="divide-y" style={{ borderColor: 'hsl(150 22% 86%)' }}>
              {data.items.map(q => (
                <li key={q.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-green-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={typeClass[q.question_type] ?? 'badge'}>{TYPE_LABELS[q.question_type]}</span>
                      <span className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-sm line-clamp-2" style={{ color: 'hsl(161 38% 13%)' }}>{q.text}</p>
                    {q.choices.length > 0 && (
                      <p className="text-xs mt-0.5" style={{ color: 'hsl(157 10% 44%)' }}>{q.choices.length} choices</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(q)}
                            className="p-1.5 rounded-lg hover:bg-green-50 transition-colors" title="Edit">
                      <Edit2 className="w-4 h-4" style={{ color: 'hsl(157 10% 44%)' }} />
                    </button>
                    <button onClick={() => { if (confirm('Delete this question?')) deleteMut.mutate(q.id) }}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {data.pages > 1 && (
              <div className="px-5 py-3 border-t flex items-center justify-between text-xs"
                   style={{ borderColor: 'hsl(150 22% 86%)', color: 'hsl(157 10% 44%)' }}>
                <span>Page {data.page} of {data.pages}</span>
                <div className="flex gap-1">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                          className="p-1 rounded border disabled:opacity-40 hover:bg-green-50 transition-colors"
                          style={{ borderColor: 'hsl(150 22% 86%)' }}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)}
                          className="p-1 rounded border disabled:opacity-40 hover:bg-green-50 transition-colors"
                          style={{ borderColor: 'hsl(150 22% 86%)' }}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        <div className="px-5 py-3 border-t" style={{ borderColor: 'hsl(150 22% 86%)' }}>
          <p className="flex items-center gap-1.5 text-xs" style={{ color: 'hsl(157 10% 44%)' }}>
            <span className="w-3 h-3 rounded-full border-2 flex-shrink-0" style={{ borderColor: 'hsl(157 10% 44%)' }} />
            Question content is sourced from your question bank
          </p>
        </div>
      </div>

      {showModal && (
        <QuestionFormModal
          question={editing}
          onClose={closeModal}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['questions'] }); closeModal() }}
        />
      )}
    </DashboardLayout>
  )
}
