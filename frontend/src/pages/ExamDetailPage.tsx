import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Rocket, Plus, Trash2, BookOpen, Award, Clock, UserPlus } from 'lucide-react'
import { examsService } from '@/services/exam'
import DashboardLayout from '@/layouts/DashboardLayout'
import LoadingState from '@/components/common/LoadingState'
import ErrorState from '@/components/common/ErrorState'
import AddQuestionsModal from '@/components/exam/AddQuestionsModal'
import EnrollCandidateModal from '@/components/exam/EnrollCandidateModal'

const TYPE_COLORS = {
  SINGLE_CHOICE: 'bg-blue-100 text-blue-700',
  MULTIPLE_CHOICE: 'bg-purple-100 text-purple-700',
  WRITTEN: 'bg-amber-100 text-amber-700',
}

const TYPE_LABELS = {
  SINGLE_CHOICE: 'SC',
  MULTIPLE_CHOICE: 'MC',
  WRITTEN: 'WR',
}

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const examId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showAddQ, setShowAddQ] = useState(false)
  const [showEnroll, setShowEnroll] = useState(false)

  const { data: exam, isLoading, isError } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examsService.get(examId),
    enabled: !isNaN(examId),
  })

  const publishMut = useMutation({
    mutationFn: () => examsService.publish(examId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exam', examId] }),
  })

  const removeQMut = useMutation({
    mutationFn: (qid: number) => examsService.removeQuestion(examId, qid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exam', examId] }),
  })

  if (isLoading) return <DashboardLayout><LoadingState /></DashboardLayout>
  if (isError || !exam) return <DashboardLayout><ErrorState message="Examination not found." /></DashboardLayout>

  const isDraft = exam.status === 'DRAFT'

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <button
            onClick={() => navigate('/examiner/exams')}
            className="p-2 hover:bg-secondary rounded-lg transition-colors mt-0.5"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                exam.status === 'DRAFT' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
              }`}>
                {exam.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{exam.title}</h1>
            {exam.description && <p className="text-muted-foreground mt-1">{exam.description}</p>}

            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                {exam.exam_questions.length} question{exam.exam_questions.length !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                {exam.total_marks} marks
                {exam.passing_marks != null && ` / ${exam.passing_marks} to pass`}
              </span>
              {exam.duration_minutes && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {exam.duration_minutes} min
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {!isDraft && (
              <button
                onClick={() => setShowEnroll(true)}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Enroll Candidate
              </button>
            )}
            {isDraft && (
              <button
                onClick={() => {
                  if (exam.exam_questions.length === 0) {
                    alert('Add at least one question before publishing.')
                    return
                  }
                  if (confirm('Publish this examination? This cannot be undone.')) {
                    publishMut.mutate()
                  }
                }}
                disabled={publishMut.isPending}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Rocket className="w-4 h-4" />
                {publishMut.isPending ? 'Publishing…' : 'Publish'}
              </button>
            )}
          </div>
        </div>

        {publishMut.isError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {(publishMut.error as Error).message || 'Failed to publish.'}
          </div>
        )}

        {/* Questions section */}
        <div className="bg-white border border-border rounded-xl">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-semibold">Questions</h2>
            {isDraft && (
              <button
                onClick={() => setShowAddQ(true)}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Questions
              </button>
            )}
          </div>

          {exam.exam_questions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No questions added yet.</p>
              {isDraft && (
                <button
                  onClick={() => setShowAddQ(true)}
                  className="mt-3 text-sm text-primary hover:underline"
                >
                  Add questions from your bank
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {exam.exam_questions.map((eq, i) => (
                <div key={eq.id} className="flex items-start gap-3 p-4">
                  <span className="text-xs font-mono text-muted-foreground w-6 shrink-0 mt-0.5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${TYPE_COLORS[eq.question.question_type]}`}>
                        {TYPE_LABELS[eq.question.question_type]}
                      </span>
                      <span className="text-xs text-muted-foreground">{eq.question.marks}m</span>
                    </div>
                    <p className="text-sm text-foreground">{eq.question.text}</p>
                    {eq.question.choices.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {eq.question.choices.map(c => (
                          <div key={c.id} className={`text-xs flex items-center gap-1.5 ${c.is_correct ? 'text-green-700 font-medium' : 'text-muted-foreground'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.is_correct ? 'bg-green-500' : 'bg-gray-300'}`} />
                            {c.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {isDraft && (
                    <button
                      onClick={() => removeQMut.mutate(eq.question.id)}
                      disabled={removeQMut.isPending}
                      className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      title="Remove from exam"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddQ && (
        <AddQuestionsModal
          examId={examId}
          existingIds={exam.exam_questions.map(eq => eq.question.id)}
          onClose={() => setShowAddQ(false)}
          onAdded={() => {
            qc.invalidateQueries({ queryKey: ['exam', examId] })
            setShowAddQ(false)
          }}
        />
      )}
      {showEnroll && (
        <EnrollCandidateModal examId={examId} onClose={() => setShowEnroll(false)} />
      )}
    </DashboardLayout>
  )
}
