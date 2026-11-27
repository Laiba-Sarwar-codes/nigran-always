import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Clock, FileText, CheckCircle, Play } from 'lucide-react'
import { candidateService } from '../services/candidate'
import type { EnrolledExam, AttemptStatus } from '../types/candidate'

function statusBadge(status: AttemptStatus) {
  switch (status) {
    case 'NOT_STARTED':
      return <span className="badge badge-upcoming">Not Started</span>
    case 'IN_PROGRESS':
      return <span className="badge badge-live">In Progress</span>
    case 'SUBMITTED':
      return <span className="badge badge-active">Submitted</span>
    case 'EXPIRED':
      return <span className="badge badge-draft">Expired</span>
  }
}

function ExamCard({ exam }: { exam: EnrolledExam }) {
  const canStart = exam.attempt_status === 'NOT_STARTED'
  const canResume = exam.attempt_status === 'IN_PROGRESS'

  return (
    <div className="n360-card p-5">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-sm leading-tight" style={{ color: 'hsl(161 38% 13%)' }}>{exam.title}</h3>
        {statusBadge(exam.attempt_status)}
      </div>

      {exam.description && (
        <p className="text-sm mb-3 line-clamp-2" style={{ color: 'hsl(157 10% 44%)' }}>{exam.description}</p>
      )}

      <div className="flex gap-4 text-xs mb-4" style={{ color: 'hsl(157 10% 44%)' }}>
        {exam.duration_minutes && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {exam.duration_minutes} min
          </span>
        )}
        <span className="flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" />
          {exam.total_marks} marks
        </span>
        {exam.passing_marks && (
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" />
            Pass: {exam.passing_marks}
          </span>
        )}
      </div>

      {(canStart || canResume) && (
        <Link
          to={`/candidate/exam/${exam.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: '#007A62' }}
        >
          <Play className="h-4 w-4" />
          {canStart ? 'Start exam' : 'Resume exam'}
        </Link>
      )}
    </div>
  )
}

export default function CandidateExamsPage() {
  const { data: exams, isLoading, error } = useQuery({
    queryKey: ['candidate-exams'],
    queryFn: candidateService.listMyExams,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-600">Failed to load examinations.</div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>Upcoming examinations</h1>
        <p className="text-sm mt-1" style={{ color: 'hsl(157 10% 44%)' }}>Examinations you have been enrolled in.</p>
      </div>

      {!exams?.length ? (
        <div className="n360-card py-20 text-center">
          <FileText className="h-10 w-10 mx-auto mb-3" style={{ color: 'hsl(157 10% 44%)', opacity: 0.4 }} />
          <p className="font-medium text-sm" style={{ color: 'hsl(161 38% 13%)' }}>No examinations yet</p>
          <p className="text-xs mt-1" style={{ color: 'hsl(157 10% 44%)' }}>Your examiner will enroll you when examinations are ready.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {exams.map(exam => (
            <ExamCard key={exam.id} exam={exam} />
          ))}
        </div>
      )}
    </div>
  )
}
