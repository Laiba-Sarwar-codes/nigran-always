import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, X, CheckCircle, AlertCircle, FileText, ArrowRight } from 'lucide-react'
import axios from 'axios'

const bulkClient = axios.create({ baseURL: '/api/v1', withCredentials: true })

interface ParsedChoice { text: string; is_correct: boolean }
interface ParsedRow {
  row_number: number
  question_type: string
  text: string
  marks: number
  choices: ParsedChoice[]
  errors: string[]
}
interface ParseResponse { valid_count: number; invalid_count: number; rows: ParsedRow[] }

type Step = 'select' | 'preview' | 'done'

export default function BulkUploadModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('select')
  const [preview, setPreview] = useState<ParseResponse | null>(null)
  const [fileName, setFileName] = useState('')
  const [importOnlyValid, setImportOnlyValid] = useState(true)
  const [importedCount, setImportedCount] = useState(0)

  const parseMut = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return bulkClient.post<ParseResponse>('/questions/bulk-upload/parse', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data)
    },
    onSuccess: (data) => {
      setPreview(data)
      setStep('preview')
    },
  })

  const confirmMut = useMutation({
    mutationFn: (rows: ParsedRow[]) =>
      bulkClient.post<{ created: number }>('/questions/bulk-upload/confirm', { rows }).then(r => r.data),
    onSuccess: (data) => {
      setImportedCount(data.created)
      setStep('done')
      qc.invalidateQueries({ queryKey: ['questions'] })
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFileName(f.name)
    parseMut.mutate(f)
  }

  const handleConfirm = () => {
    if (!preview) return
    const rows = importOnlyValid ? preview.rows.filter(r => r.errors.length === 0) : preview.rows
    confirmMut.mutate(rows)
  }

  const validRows = preview?.rows.filter(r => r.errors.length === 0) ?? []
  const invalidRows = preview?.rows.filter(r => r.errors.length > 0) ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'hsl(150 22% 86%)' }}>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>Bulk question upload</h2>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(157 10% 44%)' }}>Import questions from a CSV or Excel file</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" style={{ color: 'hsl(157 10% 44%)' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Step: select file */}
          {step === 'select' && (
            <div className="space-y-5">
              {/* Template hint */}
              <div className="p-4 rounded-xl text-sm" style={{ background: 'hsl(155 24% 97%)', borderColor: 'hsl(150 22% 86%)' }}>
                <p className="font-semibold mb-2" style={{ color: 'hsl(161 38% 13%)' }}>Required columns</p>
                <code className="text-xs block" style={{ color: 'hsl(157 10% 44%)' }}>
                  type, text, marks, choice1, choice1_correct, choice2, choice2_correct, … (up to choice6)
                </code>
                <p className="mt-2 text-xs" style={{ color: 'hsl(157 10% 44%)' }}>
                  <strong>type</strong>: SINGLE_CHOICE | MULTIPLE_CHOICE | WRITTEN &nbsp;·&nbsp;
                  <strong>choice_correct</strong>: true or false
                </p>
              </div>

              {/* Drop zone */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={parseMut.isPending}
                className="w-full border-2 border-dashed rounded-xl py-10 flex flex-col items-center gap-3 transition-colors hover:border-green-400"
                style={{ borderColor: 'hsl(150 22% 86%)' }}>
                {parseMut.isPending ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#007A62' }} />
                ) : (
                  <Upload className="w-8 h-8" style={{ color: '#007A62' }} />
                )}
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>
                    {parseMut.isPending ? 'Parsing file…' : 'Click to select file'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(157 10% 44%)' }}>Accepts .csv and .xlsx</p>
                </div>
              </button>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />

              {parseMut.error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {(parseMut.error as Error).message}
                </div>
              )}
            </div>
          )}

          {/* Step: preview */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'hsl(155 24% 94%)' }}>
                  <FileText className="w-4 h-4" style={{ color: '#007A62' }} />
                  <span className="text-sm font-medium" style={{ color: 'hsl(161 38% 13%)' }}>{fileName}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 text-green-700 font-medium">
                    <CheckCircle className="w-4 h-4" /> {preview.valid_count} valid
                  </span>
                  {preview.invalid_count > 0 && (
                    <span className="flex items-center gap-1 text-red-600 font-medium">
                      <AlertCircle className="w-4 h-4" /> {preview.invalid_count} invalid
                    </span>
                  )}
                </div>
              </div>

              {preview.invalid_count > 0 && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={importOnlyValid} onChange={e => setImportOnlyValid(e.target.checked)}
                         className="rounded" />
                  <span style={{ color: 'hsl(161 38% 13%)' }}>Import valid rows only (skip {preview.invalid_count} invalid)</span>
                </label>
              )}

              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(150 22% 86%)' }}>
                <div className="max-h-72 overflow-y-auto divide-y" style={{ borderColor: 'hsl(150 22% 86%)' }}>
                  {preview.rows.map(row => (
                    <div key={row.row_number}
                         className={`flex items-start gap-3 px-4 py-3 ${row.errors.length > 0 ? 'bg-red-50' : ''}`}>
                      <span className="text-xs font-mono mt-0.5 w-6 shrink-0" style={{ color: 'hsl(157 10% 44%)' }}>
                        {row.row_number}
                      </span>
                      {row.errors.length === 0
                        ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        : <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                            {row.question_type || '?'}
                          </span>
                          <span className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>{row.marks}m</span>
                        </div>
                        <p className="text-sm line-clamp-1" style={{ color: 'hsl(161 38% 13%)' }}>{row.text || '(empty)'}</p>
                        {row.errors.map((err, i) => (
                          <p key={i} className="text-xs text-red-600 mt-0.5">{err}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {confirmMut.error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {(confirmMut.error as Error).message}
                </div>
              )}
            </div>
          )}

          {/* Step: done */}
          {step === 'done' && (
            <div className="py-8 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'hsl(155 24% 94%)' }}>
                <CheckCircle className="w-7 h-7" style={{ color: '#007A62' }} />
              </div>
              <div>
                <p className="text-lg font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>Import complete</p>
                <p className="text-sm mt-1" style={{ color: 'hsl(157 10% 44%)' }}>
                  {importedCount} question{importedCount !== 1 ? 's' : ''} added to your bank
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3" style={{ borderColor: 'hsl(150 22% 86%)' }}>
          {step === 'done' ? (
            <button onClick={() => { onImported(); onClose() }}
                    className="ml-auto px-5 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ background: '#007A62' }}>
              Close
            </button>
          ) : (
            <>
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-gray-50"
                      style={{ borderColor: 'hsl(150 22% 86%)', color: 'hsl(157 10% 44%)' }}>
                Cancel
              </button>
              {step === 'preview' && (
                <button
                  onClick={handleConfirm}
                  disabled={confirmMut.isPending || (importOnlyValid ? validRows.length === 0 : (preview?.rows.length ?? 0) === 0)}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                  style={{ background: '#007A62' }}>
                  <ArrowRight className="w-4 h-4" />
                  {confirmMut.isPending
                    ? 'Importing…'
                    : `Import ${importOnlyValid ? validRows.length : (preview?.rows.length ?? 0)} question${(importOnlyValid ? validRows.length : (preview?.rows.length ?? 0)) !== 1 ? 's' : ''}`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
