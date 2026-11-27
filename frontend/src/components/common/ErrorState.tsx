import { AlertCircle } from 'lucide-react'

export default function ErrorState({ message = 'Something went wrong', retry }: { message?: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <AlertCircle className="w-8 h-8 text-red-500" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {retry && (
        <button onClick={retry} className="text-sm text-primary hover:underline">
          Try again
        </button>
      )}
    </div>
  )
}
