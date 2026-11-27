import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2, Edit2, ChevronLeft, ChevronRight, FileQuestion } from 'lucide-react'
import { questionsService } from '@/services/exam'
import type { Question, QuestionType, CreateQuestionRequest, ChoiceInput } from '@/types/exam'
import DashboardLayout from '@/layouts/DashboardLayout'
import LoadingState from '@/components/common/LoadingState'
import ErrorState from '@/components/common/ErrorState'
import EmptyState from '@/components/common/EmptyState'
import QuestionFormModal from '@/components/exam/QuestionFormModal'

const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: 'Single Choice',
  MULTIPLE_CHOICE: 'Multiple Choice',
  WRITTEN: 'Written Response',
}

const TYPE_COLORS: Record<QuestionType, string> = {
  SINGLE_CHOICE: 'bg-blue-100 text-blue-700',
  MULTIPLE_CHOICE: 'bg-purple-100 text-purple-700',
  WRITTEN: 'bg-amber-100 text-amber-700',
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

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Question Bank</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {data ? `${data.total} question${data.total !== 1 ? 's' : ''}` : 'Loading…'}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search questions…"
            className="w-full pl-9 pr-4 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {isLoading && <LoadingState />}
        {isError && <ErrorState message="Failed to load questions." />}

        {data && data.items.length === 0 && (
          <EmptyState
            icon={FileQuestion}
            title="No questions yet"
            description="Create your first question to build your question bank."
            action={{ label: 'Add Question', onClick: openCreate }}
          />
        )}

        {data && data.items.length > 0 && (
          <>
            <div className="space-y-3">
              {data.items.map(q => (
                <div key={q.id} className="bg-white border border-border rounded-xl p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[q.question_type]}`}>
                        {TYPE_LABELS[q.question_type]}
                      </span>
                      <span className="text-xs text-muted-foreground">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{q.text}</p>
                    {q.choices.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">{q.choices.length} choices</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(q)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this question?')) deleteMut.mutate(q.id)
                      }}
                      className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data.pages > 1 && (
              <div className="flex items-center justify-between mt-5">
                <span className="text-sm text-muted-foreground">
                  Page {data.page} of {data.pages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-2 rounded-lg border border-input disabled:opacity-40 hover:bg-secondary transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page === data.pages}
                    onClick={() => setPage(p => p + 1)}
                    className="p-2 rounded-lg border border-input disabled:opacity-40 hover:bg-secondary transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
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
