import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { dashboardPathForRole } from '@/lib/roleRedirect'
import { ClipboardCheck } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? null
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const me = await login(data)
      navigate(from ?? dashboardPathForRole(me.role), { replace: true })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">Nigrani Always Examination Platform</p>
        </div>

        <div className="bg-white rounded-xl border border-border p-8 shadow-sm">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="you@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                className="w-full px-3 py-2 rounded-lg border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            New candidate?{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
