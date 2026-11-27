import DashboardLayout from '@/layouts/DashboardLayout'
import { Settings } from 'lucide-react'

export default function AdminSettingsPage() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>Workspace settings</h1>
        <p className="text-sm mt-1" style={{ color: 'hsl(157 10% 44%)' }}>Set the defaults for your assessment workspace.</p>
      </div>

      <div className="max-w-2xl space-y-5">
        {/* Notifications */}
        <div className="n360-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'hsl(157 10% 44%)' }}>Preferences</p>
              <h2 className="text-base font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>Notifications</h2>
            </div>
            <Settings className="w-4 h-4" style={{ color: 'hsl(157 10% 44%)' }} />
          </div>
          {[
            { label: 'Examination status alerts', desc: 'A notification when an examination opens or closes.', on: true },
            { label: 'Weekly activity digest', desc: 'A brief overview of activity across this workspace.', on: false },
            { label: 'Access review reminders', desc: 'A nudge when a role or invitation needs attention.', on: true },
          ].map((item) => (
            <div key={item.label} className="flex items-start justify-between py-3 border-b last:border-0" style={{ borderColor: 'hsl(150 22% 86%)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'hsl(161 38% 13%)' }}>{item.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(157 10% 44%)' }}>{item.desc}</p>
              </div>
              <button className={`w-10 h-5 rounded-full flex items-center transition-colors flex-shrink-0 ml-4 ${item.on ? '' : 'bg-gray-200'}`}
                      style={item.on ? { background: '#007A62' } : {}}>
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${item.on ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>

        {/* Assessment defaults */}
        <div className="n360-card p-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'hsl(157 10% 44%)' }}>Workspace</p>
          <h2 className="text-base font-semibold mb-4" style={{ color: 'hsl(161 38% 13%)' }}>Assessment defaults</h2>
          {[
            { label: 'Default duration', value: '90 minutes' },
            { label: 'Candidate instructions', value: 'Required before entry' },
          ].map((row) => (
            <div key={row.label} className="flex justify-between py-3 border-b last:border-0 text-sm" style={{ borderColor: 'hsl(150 22% 86%)' }}>
              <span style={{ color: 'hsl(157 10% 44%)' }}>{row.label}</span>
              <span className="font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>{row.value}</span>
            </div>
          ))}
        </div>

        <p className="flex items-center gap-1.5 text-xs" style={{ color: 'hsl(157 10% 44%)' }}>
          <span className="w-3 h-3 rounded-full border-2 flex-shrink-0" style={{ borderColor: 'hsl(157 10% 44%)' }} />
          Preference changes apply to this workspace only
        </p>
      </div>
    </DashboardLayout>
  )
}
