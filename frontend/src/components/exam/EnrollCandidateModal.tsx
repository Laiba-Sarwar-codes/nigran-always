import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { enrollmentService } from '../../services/candidate'

interface Props {
  examId: number
  onClose: () => void
}

export default function EnrollCandidateModal({ examId, onClose }: Props) {
  const [candidateId, setCandidateId] = useState('')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => enrollmentService.enroll(examId, { candidate_id: candidateId.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-enrollments', examId] })
      setCandidateId('')
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Enroll Candidate</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Enter the candidate's User ID (UUID) to enroll them in this examination.
        </p>

        {mutation.isError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {(mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Enrollment failed.'}
          </div>
        )}

        <input
          type="text"
          value={candidateId}
          onChange={e => setCandidateId(e.target.value)}
          placeholder="Candidate User ID (UUID)"
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!candidateId.trim() || mutation.isPending}
            className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60 text-sm"
          >
            {mutation.isPending ? 'Enrolling…' : 'Enroll'}
          </button>
        </div>
      </div>
    </div>
  )
}
