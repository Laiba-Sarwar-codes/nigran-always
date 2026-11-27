import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Users, ChevronRight } from 'lucide-react'
import { examsService } from '../services/exam'

export default function ExaminerSubmissionsPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['examiner-exams'],
    queryFn: () => examsService.list({ status: 'PUBLISHED' }),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  )

  const exams = data?.items ?? []

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-6 w-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Submissions</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Select an examination to view and grade submissions.</p>

      {!exams.length ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">No published examinations yet.</div>
      ) : (
        <div className="space-y-2">
          {exams.map(e => (
            <button
              key={e.id}
              onClick={() => navigate(`/examiner/exams/${e.id}/submissions`)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors text-left"
            >
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{e.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{e.total_marks} marks · {e.duration_minutes} min</div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
