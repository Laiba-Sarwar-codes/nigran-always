import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { Role } from '@/types/auth'
import {
  ClipboardCheck, LayoutDashboard, Users, BookOpen,
  FileText, BarChart3, LogOut, Menu, User, ChevronRight,
} from 'lucide-react'
import NotificationBell from '@/components/notifications/NotificationBell'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navByRole: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: 'Dashboard',   href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Users',       href: '/admin/users',     icon: Users },
    { label: 'Activity',    href: '/admin/activity',  icon: BarChart3 },
  ],
  EXAMINER: [
    { label: 'Dashboard',     href: '/examiner/dashboard',   icon: LayoutDashboard },
    { label: 'Examinations',  href: '/examiner/exams',       icon: FileText },
    { label: 'Question Bank', href: '/examiner/questions',   icon: BookOpen },
    { label: 'Submissions',   href: '/examiner/submissions', icon: BarChart3 },
  ],
  CANDIDATE: [
    { label: 'Dashboard',  href: '/candidate/dashboard', icon: LayoutDashboard },
    { label: 'My Exams',   href: '/candidate/exams',     icon: FileText },
    { label: 'My Results', href: '/candidate/results',   icon: BarChart3 },
  ],
}

// Derive a human-readable page title from the current path
function pageTitleFromPath(path: string): string {
  const map: Record<string, string> = {
    '/admin/dashboard': 'Dashboard',
    '/admin/users': 'User Management',
    '/admin/activity': 'Audit Activity',
    '/examiner/dashboard': 'Dashboard',
    '/examiner/exams': 'Examinations',
    '/examiner/questions': 'Question Bank',
    '/examiner/submissions': 'Submissions',
    '/candidate/dashboard': 'Dashboard',
    '/candidate/exams': 'My Exams',
    '/candidate/results': 'My Results',
  }
  if (map[path]) return map[path]
  if (path.includes('/submissions')) return 'Submissions'
  if (path.includes('/grade')) return 'Grade Attempt'
  if (path.includes('/results')) return 'Results'
  if (path.includes('/exams/') && path.includes('/exam/')) return 'Exam'
  if (path.includes('/exams/')) return 'Examination Details'
  return 'Nigrani Always'
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = user ? navByRole[user.role] : []
  const pageTitle = pageTitleFromPath(location.pathname)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-border flex-shrink-0 bg-white">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
          <ClipboardCheck className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground leading-none">Nigrani Always</p>
          <p className="text-[10px] text-muted-foreground leading-none mt-0.5 uppercase tracking-wide">
            {user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'EXAMINER' ? 'Examiner' : 'Candidate'}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.href ||
            (item.href !== '/admin/dashboard' &&
             item.href !== '/examiner/dashboard' &&
             item.href !== '/candidate/dashboard' &&
             location.pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-primary text-white font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Profile + logout */}
      <div className="px-2.5 py-3 border-t border-border flex-shrink-0 space-y-1">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-secondary/70">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate">{user?.full_name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
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
    <div className="flex h-screen bg-secondary/30 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-border flex-shrink-0 shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 flex flex-col w-64 h-full bg-white border-r border-border shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 h-14 bg-white border-b border-border flex-shrink-0 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* Mobile brand */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <ClipboardCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm text-foreground">Nigrani Always</span>
          </div>
          {/* Page title (desktop) */}
          <span className="hidden md:block text-sm font-semibold text-foreground">{pageTitle}</span>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-5 md:p-6 max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
