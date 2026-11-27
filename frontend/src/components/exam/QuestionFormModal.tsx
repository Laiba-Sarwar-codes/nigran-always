import { useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Plus, Trash2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { questionsService } from '@/services/exam'
import type { Question, QuestionType } from '@/types/exam'

const choiceSchema = z.object({
  text: z.string().min(1, 'Choice text required'),
  is_correct: z.boolean(),
})

const schema = z.object({
  question_type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'WRITTEN']),
  text: z.string().min(1, 'Question text required'),
  marks: z.coerce.number().int().min(1, 'At least 1 mark'),
  choices: z.array(choiceSchema).optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  question: Question | null
  onClose: () => void
  onSaved: () => void
}

export default function QuestionFormModal({ question, onClose, onSaved }: Props) {
  const isEdit = !!question

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      question_type: question?.question_type ?? 'SINGLE_CHOICE',
      text: question?.text ?? '',
      marks: question?.marks ?? 1,
      choices: question?.choices?.map(c => ({ text: c.text, is_correct: c.is_correct })) ?? [
        { text: '', is_correct: true },
        { text: '', is_correct: false },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'choices' })
  const questionType = watch('question_type')

  useEffect(() => {
    if (questionType === 'WRITTEN') {
      setValue('choices', [])
    } else if (fields.length === 0) {
      setValue('choices', [
        { text: '', is_correct: true },
        { text: '', is_correct: false },
      ])
    }
  }, [questionType]) // eslint-disable-line react-hooks/exhaustive-deps

  const mut = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        question_type: data.question_type as QuestionType,
        text: data.text,
        marks: data.marks,
        choices: questionType !== 'WRITTEN' ? data.choices : undefined,
      }
      return isEdit
        ? questionsService.update(question.id, payload)
        : questionsService.create(payload)
    },
    onSuccess: onSaved,
  })

  const onSubmit = handleSubmit(data => mut.mutate(data))
  const isMCQ = questionType !== 'WRITTEN'

  const handleCorrectToggle = (index: number) => {
    if (questionType === 'SINGLE_CHOICE') {
      fields.forEach((_, i) => setValue(`choices.${i}.is_correct`, i === index))
    } else {
      const current = watch(`choices.${index}.is_correct`)
      setValue(`choices.${index}.is_correct`, !current)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Question' : 'New Question'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto p-5 space-y-4">
            {/* Question type */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Question Type</label>
              <select
                {...register('question_type')}
                className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isEdit}
              >
                <option value="SINGLE_CHOICE">Single Choice</option>
                <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                <option value="WRITTEN">Written Response</option>
              </select>
            </div>

            {/* Text */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Question Text</label>
              <textarea
                {...register('text')}
                rows={3}
                className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Enter question text…"
              />
              {errors.text && <p className="mt-1 text-xs text-red-600">{errors.text.message}</p>}
            </div>

            {/* Marks */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Marks</label>
              <input
                {...register('marks')}
                type="number"
                min={1}
                className="w-32 px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.marks && <p className="mt-1 text-xs text-red-600">{errors.marks.message}</p>}
            </div>

            {/* Choices */}
            {isMCQ && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">
                    Choices
                    <span className="ml-1 text-xs text-muted-foreground">
                      {questionType === 'SINGLE_CHOICE' ? '(select 1 correct)' : '(select all correct)'}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => append({ text: '', is_correct: false })}
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add choice
                  </button>
                </div>
                <div className="space-y-2">
                  {fields.map((field, i) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCorrectToggle(i)}
                        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          watch(`choices.${i}.is_correct`)
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {watch(`choices.${i}.is_correct`) && (
                          <span className="block w-2 h-2 rounded-full bg-white" />
                        )}
                      </button>
                      <input
                        {...register(`choices.${i}.text`)}
                        placeholder={`Choice ${i + 1}`}
                        className="flex-1 px-3 py-1.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {fields.length > 2 && (
                        <button type="button" onClick={() => remove(i)} className="text-muted-foreground hover:text-red-600 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mut.isError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {(mut.error as Error).message || 'Failed to save question.'}
              </div>
            )}
          </div>

          <div className="p-5 border-t border-border flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-input text-sm hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mut.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {mut.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
