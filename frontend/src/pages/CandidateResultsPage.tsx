import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Award, ChevronDown, ChevronUp, CheckCircle, XCircle } from 'lucide-react'
import { getCandidateResults, getCandidateResultDetail } from '../services/grading'
import type { CandidateResultSummary } from '../types/grading'

function ResultDetail({ resultId }: { resultId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['candidate-result-detail', resultId],
    queryFn: () => getCandidateResultDetail(resultId),
  })

  if (isLoading) return (
    <div className="p-4 text-center">
      <div className="animate-spin inline-block rounded-full h-5 w-5 border-b-2" style={{ borderColor: '#007A62' }} />
    </div>
  )
  if (!data) return null

  return (
    <div className="border-t p-5 space-y-4" style={{ borderColor: 'hsl(150 22% 86%)' }}>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg p-3 text-center" style={{ background: 'hsl(155 24% 94%)' }}>
          <div className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>{data.obtained_marks}</div>
          <div className="text-xs mt-0.5" style={{ color: 'hsl(157 10% 44%)' }}>Obtained / {data.total_marks}</div>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: 'hsl(155 24% 94%)' }}>
          <div className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>{Number(data.percentage).toFixed(1)}%</div>
          <div className="text-xs mt-0.5" style={{ color: 'hsl(157 10% 44%)' }}>Percentage</div>
        </div>
        <div className={`rounded-lg p-3 text-center ${data.result_status === 'PASS' ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <div className={`text-2xl font-bold ${data.result_status === 'PASS' ? 'text-emerald-700' : 'text-red-700'}`}>
            {data.result_status}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'hsl(157 10% 44%)' }}>Result</div>
        </div>
      </div>

      <div className="space-y-2">
        {data.questions.map((q, i) => (
          <div key={i} className="flex items-start gap-3 text-sm p-3 rounded-lg" style={{ background: 'hsl(155 24% 94%)' }}>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate" style={{ color: 'hsl(161 38% 13%)' }}>Q{i + 1}. {q.question_text}</p>
              {q.examiner_feedback && (
                <p className="text-xs mt-0.5 italic" style={{ color: 'hsl(157 10% 44%)' }}>"{q.examiner_feedback}"</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {q.awarded_marks === q.marks ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : q.awarded_marks === 0 ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <Award className="h-4 w-4 text-amber-500" />
              )}
              <span className="font-medium text-xs" style={{ color: 'hsl(161 38% 13%)' }}>
                {q.awarded_marks ?? '—'} / {q.marks}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ResultCard({ r }: { r: CandidateResultSummary }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="n360-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-green-50/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{ background: 'hsl(155 24% 94%)' }}>
            <Trophy className="h-4 w-4" style={{ color: r.result_status === 'PASS' ? '#007A62' : '#ef4444' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>{r.exam_title}</p>
            <p className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>
              Published {new Date(r.published_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-bold" style={{ color: 'hsl(161 38% 13%)' }}>{r.obtained_marks}/{r.total_marks}</p>
            <p className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>{Number(r.percentage).toFixed(1)}%</p>
          </div>
          <span className={r.result_status === 'PASS' ? 'badge badge-active' : 'badge bg-red-100 text-red-700'}>
            {r.result_status}
          </span>
          {expanded
            ? <ChevronUp className="h-4 w-4" style={{ color: 'hsl(157 10% 44%)' }} />
            : <ChevronDown className="h-4 w-4" style={{ color: 'hsl(157 10% 44%)' }} />
          }
        </div>
      </button>
      {expanded && <ResultDetail resultId={r.result_id} />}
    </div>
  )
}

export default function CandidateResultsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['candidate-results'],
    queryFn: getCandidateResults,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-7 w-7 border-b-2" style={{ borderColor: '#007A62' }} />
    </div>
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>Results</h1>
        <p className="text-sm mt-1" style={{ color: 'hsl(157 10% 44%)' }}>Published results from your completed assessments.</p>
      </div>

      {!data?.length ? (
        <div className="n360-card py-16 text-center">
          <Trophy className="h-10 w-10 mx-auto mb-3" style={{ color: 'hsl(157 10% 44%)', opacity: 0.3 }} />
          <p className="text-sm font-medium" style={{ color: 'hsl(161 38% 13%)' }}>No results published yet.</p>
          <p className="text-xs mt-1" style={{ color: 'hsl(157 10% 44%)' }}>Results will appear here once your examiner publishes them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(r => <ResultCard key={r.result_id} r={r} />)}
        </div>
      )}
    </div>
  )
}
