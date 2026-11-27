import type { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  value: string | number | null
  icon: LucideIcon
  description?: string
  color?: 'blue' | 'green' | 'purple' | 'amber'
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
  amber: 'bg-amber-50 text-amber-600',
}

export default function StatCard({ title, value, icon: Icon, description, color = 'blue' }: Props) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {value === null ? '—' : value}
          </p>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
