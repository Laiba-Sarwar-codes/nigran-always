import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Flag, WifiOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { candidateService } from '@/services/candidate'
import { useAnswerSync } from '@/hooks/useAnswerSync'
import ExamTimer from '@/components/exam/ExamTimer'
import QuestionPalette from '@/components/exam/QuestionPalette'
import SubmitConfirmDialog from '@/components/exam/SubmitConfirmDialog'
import type { AttemptDetail } from '@/types/candidate'

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' | undefined }) {
  if (!state || state === 'idle') return null
  if (state === 'saving') return (
    <span className="flex items-center gap-1 text-xs text-gray-400">
      <Loader2 className="h-3 w-3 animate-spin" /> Saving…
    </span>
  )
  if (state === 'saved') return (
    <span className="flex items-center gap-1 text-xs text-green-600">
      <CheckCircle className="h-3 w-3" /> Saved
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs text-red-500">
      <AlertCircle className="h-3 w-3" /> Save failed
    </span>
  )
}

function countAnswered(questions: AttemptDetail['questions'], responses: Record<number, { selected_choice_ids: number[]; written_text: string | null }>) {
  return questions.filter(q => {
    const r = responses[q.id]
    return (r?.selected_choice_ids?.length ?? 0) > 0 || !!r?.written_text
  }).length
}

export default function ExamWorkspacePage() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [attemptId, setAttemptId] = useState<number | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showSubmit, setShowSubmit] = useState(false)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const submitInflightRef = useRef(false)

  const sync = useAnswerSync(attemptId)

  const examQuery = useQuery({
    queryKey: ['candidate-exam', examId],
    queryFn: () => candidateService.getMyExam(Number(examId)),
    enabled: !!examId,
  })

  useEffect(() => {
    if (!examQuery.data) return
    const exam = examQuery.data
    if (exam.attempt_id) {
      setAttemptId(exam.attempt_id)
    } else if (exam.attempt_status === 'NOT_STARTED' && !attemptId && !starting) {
      setStarting(true)
      candidateService.startAttempt(Number(examId))
        .then(res => setAttemptId(res.attempt_id))
        .catch(err => setStartError(err?.response?.data?.detail ?? 'Failed to start exam'))
        .finally(() => setStarting(false))
    }
  }, [examQuery.data, examId, attemptId, starting])

  const attemptQuery = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: () => candidateService.getAttempt(attemptId!),
    enabled: !!attemptId,
    staleTime: Infinity,
  })

  useEffect(() => {
    if (attemptQuery.data) {
      sync.hydrate(attemptQuery.data.responses)
    }
  }, [attemptQuery.data]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleExpire = useCallback(async () => {
    if (!attemptId || submitInflightRef.current) return
    submitInflightRef.current = true
    try { await candidateService.submitAttempt(attemptId) } catch { /* already submitted */ }
    qc.invalidateQueries({ queryKey: ['candidate-exams'] })
    navigate('/candidate/exams', { replace: true })
  }, [attemptId, qc, navigate])

  const handleSubmit = useCallback(async () => {
    if (!attemptId || submitInflightRef.current) return
    submitInflightRef.current = true
    setSubmitting(true)
    setSubmitError(null)
    try {
      await sync.flushAll()
      await candidateService.submitAttempt(attemptId)
      qc.invalidateQueries({ queryKey: ['candidate-exams'] })
      navigate('/candidate/exams', { replace: true })
    } catch (err: unknown) {
      let actuallySubmitted = false
      try {
        const s = await candidateService.getAttemptStatus(attemptId)
        if (s.status === 'SUBMITTED') actuallySubmitted = true
      } catch { /* ignore */ }
      if (actuallySubmitted) {
        qc.invalidateQueries({ queryKey: ['candidate-exams'] })
        navigate('/candidate/exams', { replace: true })
      } else {
        setSubmitError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Submission failed. Please try again.')
        submitInflightRef.current = false
        setSubmitting(false)
      }
    }
  }, [attemptId, sync, qc, navigate])

  if (startError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-red-600 font-medium">{startError}</p>
        <button onClick={() => navigate(-1)} className="text-indigo-600 underline text-sm">Go back</button>
      </div>
    )
  }

  if (starting || examQuery.isLoading || !attemptQuery.data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    )
  }

  const attempt = attemptQuery.data
  const isSubmitted = attempt.status === 'SUBMITTED'

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <h2 className="text-2xl font-bold text-green-600">Examination Submitted</h2>
        <p className="text-gray-500">Your answers have been recorded.</p>
        <button onClick={() => navigate('/candidate/exams')} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">
          Back to My Exams
        </button>
      </div>
    )
  }

  const questions = attempt.questions
  const currentQ = questions[currentIndex]
  if (!currentQ) return null

  const currentResp = sync.localResponses[currentQ.id]
  const isFlagged = currentResp?.is_marked_for_review ?? false
  const currentSaveState = sync.saveStates[currentQ.id]
  const anyPending = Object.values(sync.saveStates).some(s => s === 'saving' || s === 'idle')
  const anyError = Object.values(sync.saveStates).some(s => s === 'error')
  const answered = countAnswered(questions, sync.localResponses)

  function handleChoiceToggle(choiceId: number, single: boolean) {
    let ids: number[]
    if (single) {
      ids = [choiceId]
    } else {
      const prev = currentResp?.selected_choice_ids ?? []
      ids = prev.includes(choiceId) ? prev.filter(x => x !== choiceId) : [...prev, choiceId]
    }
    sync.saveChoices(currentQ.id, ids, currentResp?.written_text ?? null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {sync.isOffline && (
        <div className="bg-amber-500 text-white text-sm font-medium text-center py-2 flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          No internet connection — answers will sync when you reconnect
          {sync.pendingCount > 0 && ` (${sync.pendingCount} pending)`}
        </div>
      )}

      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-semibold text-gray-900 truncate max-w-xs">{examQuery.data?.title}</h1>
          {anyError && !anyPending && (
            <span className="flex items-center gap-1 text-xs text-red-500 shrink-0">
              <AlertCircle className="h-3.5 w-3.5" /> Some answers failed to save
            </span>
          )}
          {anyPending && !sync.isOffline && (
            <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing…
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{answered}/{questions.length} answered</span>
          <ExamTimer deadlineAt={attempt.deadline_at} onExpire={handleExpire} />
          <button
            onClick={() => setShowSubmit(true)}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
          >
            Submit
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500">
                  Question {currentIndex + 1} of {questions.length} · {currentQ.marks} mark{currentQ.marks > 1 ? 's' : ''}
                </span>
                <SaveIndicator state={currentSaveState} />
              </div>
              <button
                onClick={() => sync.saveFlag(currentQ.id, !isFlagged)}
                className={`flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-lg transition-colors ${
                  isFlagged ? 'bg-yellow-100 text-yellow-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Flag className={`h-4 w-4 ${isFlagged ? 'fill-yellow-500' : ''}`} />
                {isFlagged ? 'Flagged' : 'Flag'}
              </button>
            </div>

            <p className="text-gray-900 text-lg mb-6 whitespace-pre-wrap">{currentQ.question_text}</p>

            {currentQ.question_type === 'SINGLE_CHOICE' && (
              <div className="space-y-3">
                {currentQ.choices.map(c => {
                  const selected = currentResp?.selected_choice_ids?.includes(c.id) ?? false
                  return (
                    <label key={c.id} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="radio" name={`q-${currentQ.id}`} checked={selected} onChange={() => handleChoiceToggle(c.id, true)} className="accent-indigo-600" />
                      <span className="text-gray-800">{c.choice_text}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {currentQ.question_type === 'MULTIPLE_CHOICE' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 mb-2">Select all that apply.</p>
                {currentQ.choices.map(c => {
                  const selected = currentResp?.selected_choice_ids?.includes(c.id) ?? false
                  return (
                    <label key={c.id} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="checkbox" checked={selected} onChange={() => handleChoiceToggle(c.id, false)} className="accent-indigo-600" />
                      <span className="text-gray-800">{c.choice_text}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {currentQ.question_type === 'WRITTEN' && (
              <textarea
                rows={8}
                className="w-full border border-gray-300 rounded-xl p-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Type your answer here…"
                value={currentResp?.written_text ?? ''}
                onChange={e => sync.saveWritten(currentQ.id, e.target.value)}
              />
            )}
          </div>

          <div className="flex justify-between mt-4">
            <button disabled={currentIndex === 0} onClick={() => setCurrentIndex(i => i - 1)} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium disabled:opacity-40 hover:bg-gray-50">
              Previous
            </button>
            <button disabled={currentIndex === questions.length - 1} onClick={() => setCurrentIndex(i => i + 1)} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium disabled:opacity-40 hover:bg-gray-50">
              Next
            </button>
          </div>

          {submitError && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{submitError}</div>
          )}
        </div>

        <div className="w-56 shrink-0">
          <QuestionPalette questions={questions} responses={sync.localResponses} currentIndex={currentIndex} onSelect={setCurrentIndex} />
        </div>
      </div>

      {showSubmit && (
        <SubmitConfirmDialog
          totalQuestions={questions.length}
          answeredCount={answered}
          submitting={submitting}
          onConfirm={handleSubmit}
          onCancel={() => { setShowSubmit(false); submitInflightRef.current = false }}
        />
      )}
    </div>
  )
}
