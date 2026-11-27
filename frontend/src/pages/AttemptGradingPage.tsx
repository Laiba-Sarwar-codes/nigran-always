import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Send, Award } from 'lucide-react'
import { getAttemptGrading, gradeResponse, finalizeGrading, publishResult } from '../services/grading'
import type { GradingQuestion } from '../types/grading'

function ChoiceList({ q }: { q: GradingQuestion }) {
  const selected = new Set(q.response?.selected_choice_ids ?? [])
  return (
    <ul className="space-y-1 mt-2">
      {q.choices.map(c => {
        const picked = selected.has(c.id)
        const correct = c.is_correct
        return (
          <li key={c.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
            ${picked && correct ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' :
              picked && !correct ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300' :
              !picked && correct ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' :
              'text-gray-600 dark:text-gray-400'}`}>
            {picked && correct && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
            {picked && !correct && <XCircle className="h-3.5 w-3.5 text-red-500" />}
            {!picked && correct && <CheckCircle className="h-3.5 w-3.5 text-yellow-500" />}
            {!picked && !correct && <span className="h-3.5 w-3.5 rounded-full border border-gray-300 dark:border-gray-600 inline-block" />}
            {c.choice_text}
          </li>
        )
      })}
    </ul>
  )
}

function GradeForm({ attemptId, q, onDone }: { attemptId: number; q: GradingQuestion; onDone: () => void }) {
  const [marks, setMarks] = useState(q.response?.awarded_marks?.toString() ?? '')
  const [feedback, setFeedback] = useState(q.response?.examiner_feedback ?? '')
  const qc = useQueryClient()

  const { mutate, isPending, error } = useMutation({
    mutationFn: () => gradeResponse(attemptId, q.response!.id, {
      awarded_marks: parseFloat(marks),
      feedback: feedback || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attempt-grading', attemptId] })
      onDone()
    },
  })

  return (
    <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg space-y-2">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-28">
          Marks (max {q.marks})
        </label>
        <input
          type="number" min={0} max={q.marks} step={0.5}
          value={marks} onChange={e => setMarks(e.target.value)}
          className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>
      <div className="flex items-start gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-28 pt-1">Feedback</label>
        <textarea
          value={feedback} onChange={e => setFeedback(e.target.value)} rows={2}
          className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
          placeholder="Optional feedback for candidate"
        />
      </div>
      {error && <p className="text-red-600 dark:text-red-400 text-xs">{(error as any).response?.data?.detail ?? 'Error saving grade'}</p>}
      <div className="flex justify-end">
        <button
          onClick={() => mutate()} disabled={isPending || marks === ''}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Send className="h-3 w-3" />{isPending ? 'Saving…' : 'Save grade'}
        </button>
      </div>
    </div>
  )
}

function QuestionCard({ attemptId, q, index }: { attemptId: number; q: GradingQuestion; index: number }) {
  const [expanded, setExpanded] = useState(true)
  const [grading, setGrading] = useState(false)

  const statusColor = !q.response ? 'text-gray-400'
    : q.response.grading_status === 'AUTO' ? 'text-green-600 dark:text-green-400'
    : q.response.grading_status === 'GRADED' ? 'text-blue-600 dark:text-blue-400'
    : 'text-yellow-600 dark:text-yellow-400'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Q{index + 1}</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{q.question_text}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">({q.marks} marks)</span>
        </div>
        <div className="flex items-center gap-3">
          {q.response && (
            <span className={`text-xs font-medium ${statusColor}`}>
              {q.response.grading_status === 'AUTO' && `Auto: ${q.response.awarded_marks}/${q.marks}`}
              {q.response.grading_status === 'GRADED' && `Graded: ${q.response.awarded_marks}/${q.marks}`}
              {q.response.grading_status === 'PENDING' && 'Pending manual'}
            </span>
          )}
          {!q.response && <span className="text-xs text-gray-400">No answer</span>}
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
          {q.question_type === 'WRITTEN' ? (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                {q.response?.written_text ?? <span className="text-gray-400">(no answer)</span>}
              </p>
              {q.response && (
                <>
                  {q.response.grading_status === 'GRADED' && !grading ? (
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        {q.response.awarded_marks}/{q.marks} marks
                      </span>
                      {q.response.examiner_feedback && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 italic">"{q.response.examiner_feedback}"</span>
                      )}
                      <button onClick={() => setGrading(true)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                    </div>
                  ) : (
                    <GradeForm attemptId={attemptId} q={q} onDone={() => setGrading(false)} />
                  )}
                </>
              )}
            </div>
          ) : (
            <ChoiceList q={q} />
          )}
        </div>
      )}
    </div>
  )
}

export default function AttemptGradingPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const navigate = useNavigate()
  const id = Number(attemptId)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['attempt-grading', id],
    queryFn: () => getAttemptGrading(id),
    enabled: !!id,
  })

  const finalizeMut = useMutation({
    mutationFn: () => finalizeGrading(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attempt-grading', id] }),
  })

  const publishMut = useMutation({
    mutationFn: () => publishResult(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attempt-grading', id] }),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  )
  if (!data) return <div className="p-6 text-gray-500">Not found.</div>

  const pendingCount = data.questions.filter(q => q.response?.grading_status === 'PENDING').length
  const allGraded = pendingCount === 0

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{data.exam_title}</h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm mt-0.5">
              {data.candidate_name} · {data.candidate_email}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Submitted {new Date(data.submitted_at).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {allGraded && (
              <button
                onClick={() => finalizeMut.mutate()}
                disabled={finalizeMut.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />{finalizeMut.isPending ? 'Finalizing…' : 'Finalize grading'}
              </button>
            )}
            {finalizeMut.isSuccess && (
              <button
                onClick={() => publishMut.mutate()}
                disabled={publishMut.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <Award className="h-4 w-4" />{publishMut.isPending ? 'Publishing…' : 'Publish result'}
              </button>
            )}
            {publishMut.isSuccess && (
              <span className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Result published
              </span>
            )}
          </div>
        </div>
        {finalizeMut.error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{(finalizeMut.error as any).response?.data?.detail}</p>
        )}
        {pendingCount > 0 && (
          <p className="mt-3 text-sm text-yellow-600 dark:text-yellow-400">{pendingCount} written response{pendingCount !== 1 ? 's' : ''} need manual grading.</p>
        )}
      </div>

      <div className="space-y-3">
        {data.questions.map((q, i) => (
          <QuestionCard key={q.id} attemptId={id} q={q} index={i} />
        ))}
      </div>

      <button
        onClick={() => navigate(-1)}
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        ← Back to submissions
      </button>
    </div>
  )
}
