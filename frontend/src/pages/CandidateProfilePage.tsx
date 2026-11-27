import DashboardLayout from '@/layouts/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'

export default function CandidateProfilePage() {
  const { user } = useAuth()
  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>My profile</h1>
        <p className="text-sm mt-1" style={{ color: 'hsl(157 10% 44%)' }}>Your candidate information and preferences.</p>
      </div>

      <div className="max-w-xl space-y-5">
        {/* Profile header */}
        <div className="n360-card p-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'hsl(157 10% 44%)' }}>Candidate Profile</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white"
                   style={{ background: '#007A62' }}>
                {user?.full_name ? initials(user.full_name) : 'U'}
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>{user?.full_name}</p>
                <p className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>Candidate</p>
              </div>
            </div>
            <span className="badge badge-active">Active</span>
          </div>
        </div>

        {/* Account info */}
        <div className="n360-card p-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'hsl(157 10% 44%)' }}>Personal Details</p>
          <h2 className="text-base font-semibold mb-4" style={{ color: 'hsl(161 38% 13%)' }}>Account information</h2>
          {[
            { label: 'Full name', value: user?.full_name ?? '—' },
            { label: 'Email address', value: user?.email ?? '—' },
            { label: 'Role', value: 'Candidate' },
            { label: 'Account status', value: 'Active' },
          ].map((row) => (
            <div key={row.label} className="flex justify-between py-3 border-b last:border-0 text-sm"
                 style={{ borderColor: 'hsl(150 22% 86%)' }}>
              <span style={{ color: 'hsl(157 10% 44%)' }}>{row.label}</span>
              <span className="font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>{row.value}</span>
            </div>
          ))}
          <div className="mt-4">
            <button className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors"
                    style={{ borderColor: 'hsl(150 22% 86%)', color: 'hsl(161 38% 13%)' }}>
              Request a profile update
            </button>
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-xs" style={{ color: 'hsl(157 10% 44%)' }}>
          <span className="w-3 h-3 rounded-full border-2 flex-shrink-0" style={{ borderColor: 'hsl(157 10% 44%)' }} />
          Profile updates are reviewed by your institution administrator
        </p>
      </div>
    </DashboardLayout>
  )
}
