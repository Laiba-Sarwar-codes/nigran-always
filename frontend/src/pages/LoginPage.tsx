import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import {
  Eye, EyeOff, ClipboardCheck, ShieldCheck,
  ArrowLeft, ChevronRight,
  ShieldAlert, BookOpen, GraduationCap,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { dashboardPathForRole } from '@/lib/roleRedirect'

type UIRole = 'ADMIN' | 'EXAMINER' | 'CANDIDATE'

const ROLE_CARDS: { role: UIRole; icon: typeof ShieldAlert; label: string; desc: string }[] = [
  {
    role: 'ADMIN',
    icon: ShieldAlert,
    label: 'Administrator',
    desc: 'Manage examinations, users, permissions, and the entire platform.',
  },
  {
    role: 'EXAMINER',
    icon: BookOpen,
    label: 'Examiner',
    desc: 'Create questions, manage assessments, monitor candidates, and grade responses.',
  },
  {
    role: 'CANDIDATE',
    icon: GraduationCap,
    label: 'Student',
    desc: 'Access upcoming examinations, attempt assessments, and view your results.',
  },
]

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { login, user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? null

  const [selectedRole, setSelectedRole] = useState<UIRole | null>(null)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

  if (!loading && user) {
    return <Navigate to={from ?? dashboardPathForRole(user.role)} replace />
  }

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const me = await login(data)
      // Verify the backend role matches the selected UI role
      // CANDIDATE in DB = Student in UI
      const backendRole = me.role as UIRole
      if (selectedRole && backendRole !== selectedRole) {
        const roleLabel = ROLE_CARDS.find(r => r.role === backendRole)?.label ?? backendRole
        setError(`This account belongs to the ${roleLabel} role. Please select the correct role.`)
        return
      }
      navigate(from ?? dashboardPathForRole(me.role), { replace: true })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Invalid email or password')
    }
  }

  const card = selectedRole ? ROLE_CARDS.find(r => r.role === selectedRole)! : null

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 p-10 text-white"
           style={{ background: '#102923' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <ClipboardCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Nigran 360</span>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
            <span className="text-xs uppercase tracking-widest font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Secure Examination Platform
            </span>
          </div>
          <h2 className="text-4xl font-bold leading-snug mb-4">
            Conduct examinations<br />with confidence.
          </h2>
          <p className="text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Manage the full examination lifecycle — from question authoring to result publication — with security and transparency built in.
          </p>

          {/* Role hints */}
          <div className="mt-10 space-y-3">
            {ROLE_CARDS.map(rc => (
              <div key={rc.role}
                   className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer"
                   style={{
                     background: selectedRole === rc.role ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                     border: `1px solid ${selectedRole === rc.role ? 'rgba(255,255,255,0.25)' : 'transparent'}`,
                   }}
                   onClick={() => { setSelectedRole(rc.role); setError('') }}>
                <rc.icon className="w-4 h-4 flex-shrink-0" style={{ color: selectedRole === rc.role ? '#a7f3d0' : 'rgba(255,255,255,0.5)' }} />
                <div>
                  <p className="text-sm font-medium text-white">{rc.label}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{rc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>© 2026 Nigran 360</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-10"
           style={{ background: '#EDF6F1' }}>
        <div className="w-full max-w-sm">

          {/* Mobile brand */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#102923' }}>
              <ClipboardCheck className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold" style={{ color: 'hsl(161 38% 13%)' }}>Nigran 360</span>
          </div>

          {/* ── Step 1: Role selection ── */}
          {!selectedRole ? (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>Welcome back</h1>
                <p className="text-sm mt-1.5" style={{ color: 'hsl(157 10% 44%)' }}>Select your role to continue</p>
              </div>

              <div className="space-y-3">
                {ROLE_CARDS.map(rc => (
                  <button
                    key={rc.role}
                    onClick={() => setSelectedRole(rc.role)}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-xl bg-white border text-left transition-all hover:shadow-md group"
                    style={{ borderColor: 'hsl(150 22% 86%)' }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                         style={{ background: 'hsl(155 24% 94%)' }}>
                      <rc.icon className="w-5 h-5" style={{ color: '#007A62' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>{rc.label}</p>
                      <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'hsl(157 10% 44%)' }}>{rc.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ color: '#007A62' }} />
                  </button>
                ))}
              </div>

              <p className="mt-6 text-center text-sm" style={{ color: 'hsl(157 10% 44%)' }}>
                New student?{' '}
                <Link to="/register" className="font-semibold hover:underline" style={{ color: '#007A62' }}>
                  Create an account
                </Link>
              </p>
            </>
          ) : (
            /* ── Step 2: Login form ── */
            <>
              <button
                onClick={() => { setSelectedRole(null); setError('') }}
                className="flex items-center gap-1.5 text-sm mb-6 transition-colors"
                style={{ color: 'hsl(157 10% 44%)' }}>
                <ArrowLeft className="w-4 h-4" /> Back to role selection
              </button>

              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: 'hsl(155 24% 94%)' }}>
                  {card && <card.icon className="w-5 h-5" style={{ color: '#007A62' }} />}
                </div>
                <div>
                  <h1 className="text-xl font-bold" style={{ color: 'hsl(161 38% 13%)' }}>
                    Sign in as {card?.label}
                  </h1>
                  <p className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>Enter your credentials to continue</p>
                </div>
              </div>

              {error && (
                <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600 font-bold text-xs">!</span>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="email" className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(161 38% 13%)' }}>
                    Email address
                  </label>
                  <input
                    id="email"
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    placeholder="you@institution.edu"
                    className="w-full px-3.5 py-2.5 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 transition-shadow"
                    style={{ borderColor: 'hsl(150 22% 86%)' }}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(161 38% 13%)' }}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      {...register('password')}
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 transition-shadow"
                      style={{ borderColor: 'hsl(150 22% 86%)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: 'hsl(157 10% 44%)' }}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-colors shadow-sm mt-1"
                  style={{ background: '#007A62' }}
                >
                  {isSubmitting ? 'Signing in…' : `Sign in as ${card?.label}`}
                </button>
              </form>

              {selectedRole === 'CANDIDATE' && (
                <p className="mt-6 text-center text-sm" style={{ color: 'hsl(157 10% 44%)' }}>
                  New student?{' '}
                  <Link to="/register" className="font-semibold hover:underline" style={{ color: '#007A62' }}>
                    Create an account
                  </Link>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
