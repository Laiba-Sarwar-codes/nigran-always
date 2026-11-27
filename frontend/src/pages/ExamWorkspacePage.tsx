import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Flag } from 'lucide-react'
import { candidateService } from '../services/candidate'
import ExamTimer from '../components/exam/ExamTimer'
import QuestionPalette from '../components/exam/QuestionPalette'
import SubmitConfirmDialog from '../components/exam/SubmitConfirmDialog'
import type { AttemptDetail, ResponseData, SaveResponseResult } from '../types/candidate'

function countAnswered(questions: AttemptDetail['questions'], responses: Record<number, ResponseData>) {
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
  const [localResponses, setLocalResponses] = useState<Record<number, ResponseData>>({})
  const [showSubmit, setShowSubmit] = useState(false)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  // Start or resume attempt
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
      setLocalResponses(attemptQuery.data.responses)
    }
  }, [attemptQuery.data])

  const saveMutation = useMutation({
    mutationFn: ({ aqId, data }: { aqId: number; data: { selected_choice_ids: number[]; written_text?: string | null } }) =>
      candidateService.saveResponse(attemptId!, aqId, data),
    onSuccess: (result) => {
      setLocalResponses(prev => ({
        ...prev,
        [result.attempt_question_id]: {
          attempt_question_id: result.attempt_question_id,
          selected_choice_ids: result.selected_choice_ids,
          written_text: result.written_text,
          is_marked_for_review: result.is_marked_for_review,
        },
      }))
    },
  })

  const flagMutation = useMutation<SaveResponseResult, Error, { aqId: number; marked: boolean }>({
    mutationFn: ({ aqId, marked }) =>
      candidateService.toggleReviewFlag(attemptId!, aqId, marked),
    onSuccess: (result) => {
      setLocalResponses(prev => ({
        ...prev,
        [result.attempt_question_id]: {
          ...prev[result.attempt_question_id],
          attempt_question_id: result.attempt_question_id,
          selected_choice_ids: prev[result.attempt_question_id]?.selected_choice_ids ?? [],
          written_text: prev[result.attempt_question_id]?.written_text ?? null,
          is_marked_for_review: result.is_marked_for_review,
        },
      }))
    },
  })

  const submitMutation = useMutation({
    mutationFn: () => candidateService.submitAttempt(attemptId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidate-exams'] })
      navigate('/candidate/exams', { replace: true })
    },
  })

  const handleExpire = useCallback(() => {
    submitMutation.mutate()
  }, [submitMutation])

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
  if (attempt.status === 'SUBMITTED') {
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

  const currentResp = localResponses[currentQ.id]
  const isFlagged = currentResp?.is_marked_for_review ?? false

  function handleChoiceToggle(choiceId: number, single: boolean) {
    let ids: number[]
    if (single) {
      ids = [choiceId]
    } else {
      const prev = currentResp?.selected_choice_ids ?? []
      ids = prev.includes(choiceId) ? prev.filter(x => x !== choiceId) : [...prev, choiceId]
    }
    saveMutation.mutate({ aqId: currentQ.id, data: { selected_choice_ids: ids, written_text: currentResp?.written_text ?? null } })
  }

  function handleWrittenChange(text: string) {
    saveMutation.mutate({ aqId: currentQ.id, data: { selected_choice_ids: [], written_text: text || null } })
  }

  const answered = countAnswered(questions, localResponses)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="font-semibold text-gray-900 truncate max-w-sm">{examQuery.data?.title}</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{answered}/{questions.length} answered</span>
          <ExamTimer deadlineAt={attempt.deadline_at} onExpire={handleExpire} />
          <button
            onClick={() => setShowSubmit(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            Submit
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Question area */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-500">
                Question {currentIndex + 1} of {questions.length} · {currentQ.marks} mark{currentQ.marks > 1 ? 's' : ''}
              </span>
              <button
                onClick={() => flagMutation.mutate({ aqId: currentQ.id, marked: !isFlagged })}
                className={`flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-lg transition-colors ${
                  isFlagged ? 'bg-yellow-100 text-yellow-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Flag className={`h-4 w-4 ${isFlagged ? 'fill-yellow-500' : ''}`} />
                {isFlagged ? 'Flagged' : 'Flag'}
              </button>
            </div>

            <p className="text-gray-900 text-lg mb-6 whitespace-pre-wrap">{currentQ.question_text}</p>

            {/* Choices */}
            {currentQ.question_type === 'SINGLE_CHOICE' && (
              <div className="space-y-3">
                {currentQ.choices.map(c => {
                  const selected = currentResp?.selected_choice_ids?.includes(c.id) ?? false
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                        selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${currentQ.id}`}
                        checked={selected}
                        onChange={() => handleChoiceToggle(c.id, true)}
                        className="accent-indigo-600"
                      />
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
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                        selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => handleChoiceToggle(c.id, false)}
                        className="accent-indigo-600"
                      />
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
                defaultValue={currentResp?.written_text ?? ''}
                onBlur={e => handleWrittenChange(e.target.value)}
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-4">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(i => i - 1)}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              disabled={currentIndex === questions.length - 1}
              onClick={() => setCurrentIndex(i => i + 1)}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>

        {/* Palette */}
        <div className="w-56 shrink-0">
          <QuestionPalette
            questions={questions}
            responses={localResponses}
            currentIndex={currentIndex}
            onSelect={setCurrentIndex}
          />
        </div>
      </div>

      {showSubmit && (
        <SubmitConfirmDialog
          totalQuestions={questions.length}
          answeredCount={answered}
          submitting={submitMutation.isPending}
          onConfirm={() => submitMutation.mutate()}
          onCancel={() => setShowSubmit(false)}
        />
      )}
    </div>
  )
}
