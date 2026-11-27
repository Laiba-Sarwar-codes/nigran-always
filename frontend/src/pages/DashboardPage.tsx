import { useAuth } from '@/hooks/useAuth'
import AppLayout from '@/layouts/AppLayout'
import { Users, ClipboardCheck, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'

function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Administrator Dashboard</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          to="/admin/users"
          className="p-6 bg-white rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">User Management</h3>
          <p className="text-sm text-muted-foreground">Manage examiners and candidates</p>
        </Link>
        <div className="p-6 bg-white rounded-xl border border-border opacity-60">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-4">
            <ClipboardCheck className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Examinations</h3>
          <p className="text-sm text-muted-foreground">Coming in Phase 4</p>
        </div>
      </div>
    </div>
  )
}

function ExaminerDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Examiner Dashboard</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-6 bg-white rounded-xl border border-border opacity-60">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-4">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Question Bank</h3>
          <p className="text-sm text-muted-foreground">Coming in Phase 4</p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-border opacity-60">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-4">
            <ClipboardCheck className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Examinations</h3>
          <p className="text-sm text-muted-foreground">Coming in Phase 4</p>
        </div>
      </div>
    </div>
  )
}

function CandidateDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Candidate Dashboard</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-6 bg-white rounded-xl border border-border opacity-60">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-4">
            <ClipboardCheck className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">My Examinations</h3>
          <p className="text-sm text-muted-foreground">Coming in Phase 5</p>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <AppLayout>
      <div className="mb-6 p-4 bg-white rounded-xl border border-border">
        <p className="text-sm text-muted-foreground">Logged in as</p>
        <p className="font-semibold text-foreground">{user?.full_name}</p>
        <p className="text-xs text-muted-foreground">{user?.email} · {user?.role}</p>
      </div>
      {user?.role === 'ADMIN' && <AdminDashboard />}
      {user?.role === 'EXAMINER' && <ExaminerDashboard />}
      {user?.role === 'CANDIDATE' && <CandidateDashboard />}
    </AppLayout>
  )
}
