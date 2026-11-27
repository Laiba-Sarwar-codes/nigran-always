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
      <div className="animate-spin rounded-full h-7 w-7 border-b-2" style={{ borderColor: '#007A62' }} />
    </div>
  )

  const exams = data?.items ?? []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>Grading queue</h1>
        <p className="text-sm mt-1" style={{ color: 'hsl(157 10% 44%)' }}>Select an examination to view and grade responses.</p>
      </div>

      <div className="n360-card overflow-hidden">
        {!exams.length ? (
          <div className="py-16 text-center">
            <Users className="h-8 w-8 mx-auto mb-3" style={{ color: 'hsl(157 10% 44%)', opacity: 0.4 }} />
            <p className="text-sm" style={{ color: 'hsl(157 10% 44%)' }}>No published examinations yet.</p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'hsl(150 22% 86%)' }}>
            {exams.map(e => (
              <li key={e.id}>
                <button
                  onClick={() => navigate(`/examiner/exams/${e.id}/submissions`)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-green-50/50 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'hsl(161 38% 13%)' }}>{e.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'hsl(157 10% 44%)' }}>{e.total_marks} marks · {e.duration_minutes} min</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-live">Live</span>
                    <ChevronRight className="h-4 w-4" style={{ color: 'hsl(157 10% 44%)' }} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
