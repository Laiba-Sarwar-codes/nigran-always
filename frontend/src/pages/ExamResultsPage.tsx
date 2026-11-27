import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Award } from 'lucide-react'
import { getExamResults } from '../services/grading'

export default function ExamResultsPage() {
  const { examId } = useParams<{ examId: string }>()
  const id = Number(examId)

  const { data, isLoading } = useQuery({
    queryKey: ['exam-results', id],
    queryFn: () => getExamResults(id),
    enabled: !!id,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="h-6 w-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Results</h1>
      </div>

      {!data?.length ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">No published results yet.</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Candidate</th>
                <th className="px-4 py-3 text-right">Obtained</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">%</th>
                <th className="px-4 py-3 text-left">Result</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.map(r => (
                <tr key={r.result_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{r.candidate_name}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">{r.candidate_email}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{r.obtained_marks}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{r.total_marks}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{Number(r.percentage).toFixed(1)}%</td>
                  <td className="px-4 py-3">
                    {r.result_status ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                        ${r.result_status === 'PASS' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {r.result_status === 'PASS' ? <Award className="h-3 w-3" /> : null}
                        {r.result_status}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                      ${r.publication_status === 'PUBLISHED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        r.publication_status === 'GRADED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                      {r.publication_status}
                    </span>
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
