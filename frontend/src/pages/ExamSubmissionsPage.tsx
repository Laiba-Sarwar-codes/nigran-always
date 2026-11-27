import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Users, Clock, CheckCircle, AlertCircle, Eye } from 'lucide-react'
import { getSubmissions } from '../services/grading'
import type { SubmissionSummary } from '../types/grading'

function StatusBadge({ s }: { s: SubmissionSummary }) {
  if (s.publication_status === 'PUBLISHED')
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Published</span>
  if (s.publication_status === 'GRADED')
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Graded</span>
  if (s.pending_manual > 0)
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">Needs grading ({s.pending_manual})</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">Auto-graded</span>
}

export default function ExamSubmissionsPage() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()
  const id = Number(examId)

  const { data: submissions, isLoading, error } = useQuery({
    queryKey: ['submissions', id],
    queryFn: () => getSubmissions(id),
    enabled: !!id,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  )

  if (error) return (
    <div className="p-6 text-red-600 dark:text-red-400">Failed to load submissions.</div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-6 w-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Submissions</h1>
      </div>

      {!submissions?.length ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          No submissions yet.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Candidate</th>
                <th className="px-4 py-3 text-left">Submitted</th>
                <th className="px-4 py-3 text-center">Auto</th>
                <th className="px-4 py-3 text-center">Pending</th>
                <th className="px-4 py-3 text-center">Graded</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {submissions.map(s => (
                <tr key={s.attempt_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{s.candidate_name}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">{s.candidate_email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(s.submitted_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-3 w-3" />{s.auto_graded}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 ${s.pending_manual > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400'}`}>
                      <AlertCircle className="h-3 w-3" />{s.pending_manual}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{s.manual_graded}</td>
                  <td className="px-4 py-3"><StatusBadge s={s} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => navigate(`/examiner/attempts/${s.attempt_id}/grade`)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                    >
                      <Eye className="h-3 w-3" /> Grade
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
