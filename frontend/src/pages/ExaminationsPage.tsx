import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, Trash2, BookOpen, Clock, Award, ClipboardList } from 'lucide-react'
import { examsService } from '@/services/exam'
import type { CreateExamRequest } from '@/types/exam'
import DashboardLayout from '@/layouts/DashboardLayout'
import LoadingState from '@/components/common/LoadingState'
import ErrorState from '@/components/common/ErrorState'
import EmptyState from '@/components/common/EmptyState'
import CreateExamModal from '@/components/exam/CreateExamModal'

const STATUS_COLORS = {
  DRAFT: 'bg-amber-100 text-amber-700',
  PUBLISHED: 'bg-green-100 text-green-700',
}

export default function ExaminationsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['exams', page],
    queryFn: () => examsService.list({ page, per_page: 15 }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => examsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exams'] }),
  })

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Examinations</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {data ? `${data.total} examination${data.total !== 1 ? 's' : ''}` : 'Loading…'}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Exam
          </button>
        </div>

        {isLoading && <LoadingState />}
        {isError && <ErrorState message="Failed to load examinations." />}

        {data && data.items.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            title="No examinations yet"
            description="Create your first examination to get started."
            action={{ label: 'New Exam', onClick: () => setShowCreate(true) }}
          />
        )}

        {data && data.items.length > 0 && (
          <div className="space-y-3">
            {data.items.map(exam => (
              <div
                key={exam.id}
                className="bg-white border border-border rounded-xl p-4 hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => navigate(`/examiner/exams/${exam.id}`)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[exam.status]}`}>
                        {exam.status}
                      </span>
                    </div>
                    <h3 className="font-medium text-foreground truncate">{exam.title}</h3>
                    {exam.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{exam.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {exam.exam_questions.length} question{exam.exam_questions.length !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {exam.total_marks} marks
                      </span>
                      {exam.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {exam.duration_minutes} min
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {exam.status === 'DRAFT' && (
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          if (confirm('Delete this examination?')) deleteMut.mutate(exam.id)
                        }}
                        className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {data && data.pages > 1 && (
          <div className="flex justify-center gap-2 mt-5">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 border border-input rounded-lg text-sm disabled:opacity-40 hover:bg-secondary transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-muted-foreground">
              {page} / {data.pages}
            </span>
            <button
              disabled={page === data.pages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 border border-input rounded-lg text-sm disabled:opacity-40 hover:bg-secondary transition-colors"
            >
              Next
            </button>
          </div>
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
