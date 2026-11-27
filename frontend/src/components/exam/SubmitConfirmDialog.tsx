interface Props {
  totalQuestions: number
  answeredCount: number
  onConfirm: () => void
  onCancel: () => void
  submitting: boolean
}

export default function SubmitConfirmDialog({
  totalQuestions,
  answeredCount,
  onConfirm,
  onCancel,
  submitting,
}: Props) {
  const unanswered = totalQuestions - answeredCount

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Submit Examination?</h2>
        <p className="text-gray-600 mb-4">
          You have answered <strong>{answeredCount}</strong> of{' '}
          <strong>{totalQuestions}</strong> questions.
          {unanswered > 0 && (
            <span className="text-amber-600 font-medium">
              {' '}{unanswered} question{unanswered > 1 ? 's' : ''} left unanswered.
            </span>
          )}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Once submitted, you cannot change your answers.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
