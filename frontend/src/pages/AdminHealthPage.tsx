import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import DashboardLayout from '@/layouts/DashboardLayout'
import { getHealth } from '@/services/health'

export default function AdminHealthPage() {
  const { data, isError, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['health-admin'],
    queryFn: getHealth,
    refetchInterval: 30000,
    retry: 1,
  })

  const isOk = !isError && data?.status === 'ok'
  const lastChecked = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'

  const tiles = [
    {
      label: 'Backend API',
      desc: 'FastAPI application server',
      ok: isOk,
      detail: isOk ? `Status: ${data?.status}` : 'Unreachable or error',
    },
    {
      label: 'Service name',
      desc: 'Application identifier',
      ok: isOk,
      detail: isOk ? (data?.service ?? 'nigrani-always') : '—',
    },
  ]

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>System health</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(157 10% 44%)' }}>
            Live service status — last checked at {lastChecked}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors hover:bg-green-50 disabled:opacity-50"
          style={{ borderColor: 'hsl(150 22% 86%)', color: 'hsl(161 38% 13%)' }}
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overall status banner */}
      <div className={`n360-card p-5 mb-6 flex items-center gap-4 border-l-4 ${isOk ? 'border-l-green-500' : 'border-l-red-500'}`}>
        {isOk
          ? <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
          : <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />}
        <div>
          <p className="text-sm font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>
            {isOk ? 'All systems operational' : 'Service degraded or unreachable'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(157 10% 44%)' }}>
            {isOk
              ? 'Backend API and database are responding normally.'
              : 'One or more services may be unavailable. Check the backend logs.'}
          </p>
        </div>
      </div>

      {/* Service tiles */}
      <div className="grid sm:grid-cols-2 gap-4">
        {tiles.map(t => (
          <div key={t.label} className="n360-card p-5 flex items-start gap-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
              t.ok ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {t.ok
                ? <CheckCircle className="w-5 h-5 text-green-600" />
                : <XCircle className="w-5 h-5 text-red-600" />}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>{t.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(157 10% 44%)' }}>{t.desc}</p>
              <p className={`text-xs mt-1 font-medium ${t.ok ? 'text-green-700' : 'text-red-600'}`}>{t.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs mt-6 flex items-center gap-1.5" style={{ color: 'hsl(157 10% 44%)' }}>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOk ? 'bg-emerald-400' : 'bg-red-400'}`} />
        Auto-refreshes every 30 seconds · Last checked {lastChecked}
      </p>
    </DashboardLayout>
  )
}
