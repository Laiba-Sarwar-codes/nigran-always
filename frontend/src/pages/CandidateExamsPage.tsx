import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Clock, FileText, CheckCircle, Play } from 'lucide-react'
import { candidateService } from '../services/candidate'
import type { EnrolledExam, AttemptStatus } from '../types/candidate'

function statusBadge(status: AttemptStatus) {
  switch (status) {
    case 'NOT_STARTED':
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Not Started</span>
    case 'IN_PROGRESS':
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">In Progress</span>
    case 'SUBMITTED':
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Submitted</span>
    case 'EXPIRED':
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Expired</span>
  }
}

function ExamCard({ exam }: { exam: EnrolledExam }) {
  const canStart = exam.attempt_status === 'NOT_STARTED'
  const canResume = exam.attempt_status === 'IN_PROGRESS'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-lg leading-tight">{exam.title}</h3>
        {statusBadge(exam.attempt_status)}
      </div>

      {exam.description && (
        <p className="text-gray-500 text-sm mb-3 line-clamp-2">{exam.description}</p>
      )}

      <div className="flex gap-4 text-sm text-gray-500 mb-4">
        {exam.duration_minutes && (
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {exam.duration_minutes} min
          </span>
        )}
        <span className="flex items-center gap-1">
          <FileText className="h-4 w-4" />
          {exam.total_marks} marks
        </span>
        {exam.passing_marks && (
          <span className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            Pass: {exam.passing_marks}
          </span>
        )}
      </div>

      {(canStart || canResume) && (
        <Link
          to={`/candidate/exam/${exam.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          <Play className="h-4 w-4" />
          {canStart ? 'Start Exam' : 'Resume Exam'}
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Examinations</h1>
        <p className="text-gray-500 mt-1">Examinations you have been enrolled in.</p>
      </div>

      {!exams?.length ? (
        <div className="text-center py-20 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No examinations yet</p>
          <p className="text-sm">Your examiner will enroll you when examinations are ready.</p>
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
