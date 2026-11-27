import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

interface Props {
  deadlineAt: string
  onExpire: () => void
}

export default function ExamTimer({ deadlineAt, onExpire }: Props) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const deadline = new Date(deadlineAt).getTime()

    const tick = () => {
      const diff = Math.max(0, deadline - Date.now())
      setRemaining(diff)
      if (diff === 0) onExpire()
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadlineAt, onExpire])

  const totalSecs = Math.floor(remaining / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  const formatted = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`

  const isLow = totalSecs < 300

  return (
    <div className={`flex items-center gap-2 font-mono text-lg font-semibold px-4 py-2 rounded-lg ${
      isLow ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
    }`}>
      <Clock className="h-5 w-5" />
      {formatted}
    </div>
  )
}
