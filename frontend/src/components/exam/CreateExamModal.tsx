import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { examsService } from '@/services/exam'

const schema = z.object({
  title: z.string().min(1, 'Title required').max(255),
  description: z.string().optional(),
  duration_minutes: z.coerce.number().int().min(1).optional().or(z.literal('')),
  passing_marks: z.coerce.number().int().min(0).optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

interface Props {
  onClose: () => void
  onCreated: (id: number) => void
}

export default function CreateExamModal({ onClose, onCreated }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mut = useMutation({
    mutationFn: (data: FormData) => examsService.create({
      title: data.title,
      description: data.description || undefined,
      duration_minutes: data.duration_minutes ? Number(data.duration_minutes) : undefined,
      passing_marks: data.passing_marks !== '' && data.passing_marks !== undefined
        ? Number(data.passing_marks)
        : undefined,
    }),
    onSuccess: exam => onCreated(exam.id),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold">New Examination</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => mut.mutate(d))} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Title <span className="text-red-500">*</span></label>
            <input
              {...register('title')}
              className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. Mid-Term Mathematics"
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea
              {...register('description')}
              rows={2}
              className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Optional description…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Duration (minutes)</label>
              <input
                {...register('duration_minutes')}
                type="number"
                min={1}
                className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. 60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Passing Marks</label>
              <input
                {...register('passing_marks')}
                type="number"
                min={0}
                className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. 50"
              />
            </div>
          </div>

          {mut.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              Failed to create examination.
            </div>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mut.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {mut.isPending ? 'Creating…' : 'Create Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
