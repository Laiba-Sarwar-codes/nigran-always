import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '@/layouts/DashboardLayout'
import { dashboardService } from '@/services/dashboard'
import { FileText, ArrowRight } from 'lucide-react'

export default function ExamRoomRedirectPage() {
  const navigate = useNavigate()
  const { data: recentExams } = useQuery({
    queryKey: ['candidate-recent-exams'],
    queryFn: dashboardService.candidateRecentExams,
  })

  const exams = (recentExams?.items ?? []) as {
    id: number; title: string; status: string
  }[]
  const liveExam = exams.find(e => e.status === 'PUBLISHED')

  if (liveExam) {
    navigate(`/candidate/exam/${liveExam.id}`, { replace: true })
    return null
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>Exam room</h1>
        <p className="text-sm mt-1" style={{ color: 'hsl(157 10% 44%)' }}>A quiet, focused space for your examination.</p>
      </div>
      <div className="n360-card p-10 flex flex-col items-center text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
             style={{ background: 'hsl(155 24% 94%)' }}>
          <FileText className="w-6 h-6" style={{ color: '#007A62' }} />
        </div>
        <h2 className="text-base font-semibold mb-2" style={{ color: 'hsl(161 38% 13%)' }}>No active examination</h2>
        <p className="text-sm mb-5" style={{ color: 'hsl(157 10% 44%)' }}>
          Your upcoming examinations appear on the Upcoming exams page. Enter an exam from there when it opens.
        </p>
        <button onClick={() => navigate('/candidate/exams')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#007A62' }}>
          View upcoming exams <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </DashboardLayout>
  )
}
