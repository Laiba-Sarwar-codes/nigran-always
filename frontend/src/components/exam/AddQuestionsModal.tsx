import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { X, Search, Check } from 'lucide-react'
import { questionsService, examsService } from '@/services/exam'
import type { QuestionType } from '@/types/exam'

const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: 'SC',
  MULTIPLE_CHOICE: 'MC',
  WRITTEN: 'WR',
}

const TYPE_COLORS: Record<QuestionType, string> = {
  SINGLE_CHOICE: 'bg-blue-100 text-blue-700',
  MULTIPLE_CHOICE: 'bg-purple-100 text-purple-700',
  WRITTEN: 'bg-amber-100 text-amber-700',
}

interface Props {
  examId: number
  existingIds: number[]
  onClose: () => void
  onAdded: () => void
}

export default function AddQuestionsModal({ examId, existingIds, onClose, onAdded }: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['questions-picker', search],
    queryFn: () => questionsService.list({ per_page: 50, q: search || undefined }),
  })

  const addMut = useMutation({
    mutationFn: () => examsService.addQuestions(examId, Array.from(selected)),
    onSuccess: onAdded,
  })

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const available = data?.items.filter(q => !existingIds.includes(q.id)) ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold">Add Questions</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search questions…"
              className="w-full pl-9 pr-4 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading && (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading…</div>
          )}
          {!isLoading && available.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No questions available to add.
            </div>
          )}
          {available.map(q => {
            const isSelected = selected.has(q.id)
            return (
              <button
                key={q.id}
                onClick={() => toggle(q.id)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  isSelected ? 'bg-primary/5 border border-primary/20' : 'hover:bg-secondary border border-transparent'
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isSelected ? 'bg-primary border-primary' : 'border-gray-300'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${TYPE_COLORS[q.question_type]}`}>
                      {TYPE_LABELS[q.question_type]}
                    </span>
                    <span className="text-xs text-muted-foreground">{q.marks}m</span>
                  </div>
                  <p className="text-sm text-foreground line-clamp-2">{q.text}</p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selected.size > 0 ? `${selected.size} selected` : 'None selected'}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button
              onClick={() => addMut.mutate()}
              disabled={selected.size === 0 || addMut.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {addMut.isPending ? 'Adding…' : `Add ${selected.size > 0 ? selected.size : ''} Question${selected.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
