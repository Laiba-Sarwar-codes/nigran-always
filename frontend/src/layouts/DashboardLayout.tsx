import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { Role } from '@/types/auth'
import {
  ClipboardCheck, LayoutDashboard, Users, BookOpen,
  FileText, BarChart3, LogOut, Menu, X, User,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
}

const navByRole: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Examinations', href: '/admin/examinations', icon: FileText, disabled: true },
    { label: 'Activity', href: '/admin/activity', icon: BarChart3 },
  ],
  EXAMINER: [
    { label: 'Dashboard', href: '/examiner/dashboard', icon: LayoutDashboard },
    { label: 'Examinations', href: '/examiner/exams', icon: FileText },
    { label: 'Question Bank', href: '/examiner/questions', icon: BookOpen },
    { label: 'Results', href: '/examiner/results', icon: BarChart3, disabled: true },
  ],
  CANDIDATE: [
    { label: 'Dashboard', href: '/candidate/dashboard', icon: LayoutDashboard },
    { label: 'My Examinations', href: '/candidate/examinations', icon: FileText, disabled: true },
    { label: 'Results', href: '/candidate/results', icon: BarChart3, disabled: true },
  ],
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = user ? navByRole[user.role] : []

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border flex-shrink-0">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <ClipboardCheck className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-sm text-foreground">Nigrani Always</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.href
          if (item.disabled) {
            return (
              <span
                key={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground/50 cursor-not-allowed select-none"
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
                <span className="ml-auto text-xs bg-muted text-muted-foreground/60 px-1.5 py-0.5 rounded">
                  Soon
                </span>
              </span>
            )
          }
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Profile + logout */}
      <div className="px-3 py-3 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-secondary/50 mb-1">
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-secondary/20 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-border flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 flex flex-col w-56 h-full bg-white border-r border-border">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 bg-white border-b border-border flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <ClipboardCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm">Nigrani Always</span>
          </div>
          {sidebarOpen && (
            <button onClick={() => setSidebarOpen(false)} className="ml-auto text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
