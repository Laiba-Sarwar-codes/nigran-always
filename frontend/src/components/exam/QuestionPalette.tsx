import type { AttemptQuestion, ResponseData } from '../../types/candidate'

interface Props {
  questions: AttemptQuestion[]
  responses: Record<number, ResponseData>
  currentIndex: number
  onSelect: (index: number) => void
}

export default function QuestionPalette({ questions, responses, currentIndex, onSelect }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">Questions</h3>
      <div className="grid grid-cols-5 gap-2">
        {questions.map((q, i) => {
          const resp = responses[q.id]
          const answered =
            (resp?.selected_choice_ids?.length ?? 0) > 0 || !!resp?.written_text
          const flagged = resp?.is_marked_for_review ?? false
          const isCurrent = i === currentIndex

          let cls = 'w-9 h-9 rounded-lg text-sm font-medium transition-colors cursor-pointer border '
          if (isCurrent) {
            cls += 'bg-indigo-600 text-white border-indigo-600'
          } else if (flagged) {
            cls += 'bg-yellow-100 text-yellow-800 border-yellow-300'
          } else if (answered) {
            cls += 'bg-green-100 text-green-800 border-green-300'
          } else {
            cls += 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
          }

          return (
            <button key={q.id} className={cls} onClick={() => onSelect(i)}>
              {i + 1}
            </button>
          )
        })}
      </div>
      <div className="mt-4 space-y-1 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-green-100 border border-green-300 inline-block" />
          Answered
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300 inline-block" />
          Flagged
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-gray-50 border border-gray-200 inline-block" />
          Unanswered
        </div>
      </div>
    </div>
  )
}
