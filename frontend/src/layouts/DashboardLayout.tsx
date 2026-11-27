import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { Role } from '@/types/auth'
import {
  LayoutDashboard, FileText, Users, BarChart3, Settings, BookOpen,
  Radio, ClipboardList, TrendingUp, Calendar, User, ChevronRight,
  Menu, Search, LogOut, ChevronDown,
} from 'lucide-react'
import NotificationBell from '@/components/notifications/NotificationBell'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

const navByRole: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: 'Overview',       href: '/admin/dashboard',  icon: LayoutDashboard },
    { label: 'Examinations',   href: '/admin/exams',      icon: FileText },
    { label: 'People & access',href: '/admin/users',      icon: Users },
    { label: 'Activity',       href: '/admin/activity',   icon: BarChart3 },
    { label: 'Settings',       href: '/admin/settings',   icon: Settings },
  ],
  EXAMINER: [
    { label: 'Overview',       href: '/examiner/dashboard',   icon: LayoutDashboard },
    { label: 'Examinations',   href: '/examiner/exams',       icon: FileText },
    { label: 'Question bank',  href: '/examiner/questions',   icon: BookOpen },
    { label: 'Live monitor',   href: '/examiner/monitor',     icon: Radio },
    { label: 'Grading queue',  href: '/examiner/grading',     icon: ClipboardList },
    { label: 'Reports',        href: '/examiner/reports',     icon: TrendingUp },
  ],
  CANDIDATE: [
    { label: 'My overview',    href: '/candidate/dashboard',  icon: LayoutDashboard },
    { label: 'Upcoming exams', href: '/candidate/exams',      icon: Calendar },
    { label: 'Exam room',      href: '/candidate/exam-room',  icon: FileText },
    { label: 'Results',        href: '/candidate/results',    icon: BarChart3 },
    { label: 'My profile',     href: '/candidate/profile',    icon: User },
  ],
}

function roleName(role: Role): string {
  if (role === 'ADMIN') return 'Administrator'
  if (role === 'EXAMINER') return 'Examiner'
  return 'Candidate'
}

function pageTitle(pathname: string): string {
  const map: Record<string, string> = {
    '/admin/dashboard': 'Overview',
    '/admin/exams': 'Examinations',
    '/admin/users': 'People & access',
    '/admin/activity': 'Activity',
    '/admin/settings': 'Settings',
    '/examiner/dashboard': 'Overview',
    '/examiner/exams': 'Examinations',
    '/examiner/questions': 'Question bank',
    '/examiner/monitor': 'Live monitor',
    '/examiner/grading': 'Grading queue',
    '/examiner/reports': 'Reports',
    '/candidate/dashboard': 'My overview',
    '/candidate/exams': 'Upcoming exams',
    '/candidate/exam-room': 'Exam room',
    '/candidate/results': 'Results',
    '/candidate/profile': 'My profile',
  }
  if (map[pathname]) return map[pathname]
  if (pathname.includes('/grade')) return 'Grading queue'
  if (pathname.includes('/submissions')) return 'Grading queue'
  if (pathname.includes('/results')) return 'Reports'
  if (pathname.includes('/exams/')) return 'Examinations'
  if (pathname.includes('/exam/')) return 'Exam room'
  return 'Workspace'
}

function workspaceLabel(role: Role) {
  if (role === 'ADMIN') return 'Administrator workspace'
  if (role === 'EXAMINER') return 'Examiner workspace'
  return 'Candidate workspace'
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const role = user?.role ?? 'CANDIDATE'
  const navItems = navByRole[role] ?? []
  const title = pageTitle(location.pathname)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isActive = (href: string) =>
    location.pathname === href ||
    (!href.endsWith('/dashboard') && !href.endsWith('/overview') &&
     location.pathname.startsWith(href) && href !== '/admin/exams')

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b flex-shrink-0" style={{ borderColor: '#1e3d34' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
               style={{ background: '#1e3d34' }}>
            <span className="text-sm font-bold" style={{ color: '#d1e8df' }}>ن</span>
          </div>
          <div>
            <div className="text-sm font-bold leading-none" style={{ color: '#d1e8df' }}>Nigran 360</div>
            <div className="text-[9px] mt-0.5 uppercase tracking-widest font-medium" style={{ color: '#7ba898' }}>
              Assessment Workspace
            </div>
          </div>
        </div>
      </div>

      {/* Workspace selector */}
      <div className="px-3 py-3 border-b flex-shrink-0" style={{ borderColor: '#1e3d34' }}>
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors"
                style={{ background: '#1e3d34' }}>
          <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
               style={{ background: '#007A62', color: '#fff' }}>
            {user?.full_name ? user.full_name[0].toUpperCase() : 'N'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: '#d1e8df' }}>
              {user?.full_name ?? 'Workspace'}
            </div>
            <div className="text-[10px]" style={{ color: '#7ba898' }}>{roleName(role)}</div>
          </div>
          <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: '#7ba898' }} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        <div className="text-[9px] font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: '#7ba898' }}>
          Workspace
        </div>
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all group"
              style={{
                background: active ? '#1e3d34' : 'transparent',
                color: active ? '#d1e8df' : '#7ba898',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#172e28' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 font-medium">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-50" />}
              {item.badge != null && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: '#007A62', color: '#fff' }}>
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t flex-shrink-0 space-y-1" style={{ borderColor: '#1e3d34' }}>
        <div className="px-3 py-2 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] font-semibold" style={{ color: '#d1e8df' }}>All systems steady</div>
            <div className="text-[10px]" style={{ color: '#7ba898' }}>Last checked just now</div>
          </div>
        </div>
        <button
          onClick={() => navigate('/help')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: '#7ba898' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#172e28' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <span className="text-xs font-medium">Help & support</span>
          <ChevronRight className="w-3 h-3 ml-auto" />
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: '#7ba898' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#172e28' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <LogOut className="w-4 h-4" />
          <div className="flex-1 text-left">
            <div className="text-[11px] font-medium" style={{ color: '#d1e8df' }}>{user?.full_name}</div>
            <div className="text-[10px]" style={{ color: '#7ba898' }}>{roleName(role)}</div>
          </div>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'hsl(157 38% 96%)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0" style={{ background: '#102923' }}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 flex flex-col w-64 h-full" style={{ background: '#102923' }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-5 h-14 bg-white border-b flex-shrink-0"
                style={{ borderColor: 'hsl(150 22% 88%)' }}>
          <button onClick={() => setSidebarOpen(true)}
                  className="md:hidden text-gray-400 hover:text-gray-600">
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="hidden md:flex items-center gap-2 text-sm flex-1">
            <span style={{ color: 'hsl(157 10% 44%)' }}>Workspace</span>
            <ChevronRight className="w-3 h-3" style={{ color: 'hsl(157 10% 44%)' }} />
            <span className="font-semibold" style={{ color: 'hsl(161 38% 13%)' }}>{title}</span>
          </div>
          <span className="md:hidden font-semibold text-sm" style={{ color: 'hsl(161 38% 13%)' }}>{title}</span>

          <div className="ml-auto flex items-center gap-2">
            {/* Search */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm"
                 style={{ borderColor: 'hsl(150 22% 86%)', background: 'hsl(155 24% 94%)' }}>
              <Search className="w-3.5 h-3.5" style={{ color: 'hsl(157 10% 44%)' }} />
              <span className="text-xs" style={{ color: 'hsl(157 10% 44%)' }}>Search workspace</span>
            </div>

            {/* Role badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium"
                 style={{ borderColor: 'hsl(150 22% 86%)', color: 'hsl(161 38% 13%)' }}>
              <div className="w-3 h-3 rounded-sm flex-shrink-0"
                   style={{ background: '#007A62' }} />
              <span>Workspace as</span>
              <span className="font-bold">{roleName(role)}</span>
            </div>

            {/* Notifications */}
            <NotificationBell />

            {/* Avatar */}
            <button className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: '#007A62', color: '#fff' }}>
              {user?.full_name ? initials(user.full_name) : 'U'}
            </button>
          </div>
        </header>

        {/* Workspace label + page label */}
        <div className="px-6 pt-5 pb-0 flex-shrink-0">
          <p className="text-xs font-medium mb-1" style={{ color: '#007A62' }}>
            — {workspaceLabel(role)}
          </p>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-6 pb-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
