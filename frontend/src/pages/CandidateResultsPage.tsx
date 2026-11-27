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

  if (isLoading) return <div className="p-4 text-center"><div className="animate-spin inline-block rounded-full h-5 w-5 border-b-2 border-indigo-600" /></div>
  if (!data) return null

  return (
    <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-3">
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.obtained_marks}</div>
          <div className="text-gray-500 dark:text-gray-400 text-xs">Obtained / {data.total_marks}</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{Number(data.percentage).toFixed(1)}%</div>
          <div className="text-gray-500 dark:text-gray-400 text-xs">Percentage</div>
        </div>
        <div className={`rounded-lg p-3 text-center ${data.result_status === 'PASS' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
          <div className={`text-2xl font-bold ${data.result_status === 'PASS' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
            {data.result_status}
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-xs">Result</div>
        </div>
      </div>

      <div className="space-y-2">
        {data.questions.map((q, i) => (
          <div key={i} className="flex items-start gap-3 text-sm p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">Q{i + 1}. {q.question_text}</p>
              {q.examiner_feedback && (
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 italic">"{q.examiner_feedback}"</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {q.awarded_marks === q.marks ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : q.awarded_marks === 0 ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <Award className="h-4 w-4 text-yellow-500" />
              )}
              <span className="font-medium text-gray-700 dark:text-gray-300">
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${r.result_status === 'PASS' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            <Trophy className={`h-5 w-5 ${r.result_status === 'PASS' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">{r.exam_title}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Published {new Date(r.published_at).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-lg font-bold text-gray-900 dark:text-white">{r.obtained_marks}/{r.total_marks}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{Number(r.percentage).toFixed(1)}%</div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
            ${r.result_status === 'PASS' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
            {r.result_status}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
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
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="h-6 w-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Results</h1>
      </div>

      {!data?.length ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No results published yet.</p>
          <p className="text-sm mt-1">Results will appear here once your examiner publishes them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(r => <ResultCard key={r.result_id} r={r} />)}
        </div>
      )}
    </div>
  )
}
