import { useQuery } from '@tanstack/react-query'
import { getHealth } from '@/services/health'
import {
  BookOpen,
  ClipboardCheck,
  Shield,
  Users,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

const features = [
  {
    icon: ClipboardCheck,
    title: 'Smart Examination',
    description:
      'Create, schedule, and deliver examinations with precision. Adaptive formats for every discipline.',
  },
  {
    icon: Shield,
    title: 'Secure & Proctored',
    description:
      'Academic integrity built into every session. Tamper-proof submissions and audit trails.',
  },
  {
    icon: BarChart3,
    title: 'Deep Analytics',
    description:
      'Instant performance insights for students and faculty. Track progress over time.',
  },
  {
    icon: Users,
    title: 'Multi-Role Access',
    description:
      'Seamless workflows for administrators, faculty, and students in one unified platform.',
  },
  {
    icon: Clock,
    title: 'Real-Time Monitoring',
    description:
      'Live dashboards during active examinations. Intervention tools for invigilators.',
  },
  {
    icon: BookOpen,
    title: 'Question Bank',
    description:
      'Manage thousands of questions across subjects. Version control and difficulty tagging.',
  },
]

export default function LandingPage() {
  const { data: health, isError } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    retry: false,
  })

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-foreground tracking-tight">
              Nigrani Always
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#about" className="hover:text-foreground transition-colors">
              About
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {health ? (
              <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                <CheckCircle2 className="w-3 h-3" />
                API Connected
              </span>
            ) : isError ? (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                <AlertCircle className="w-3 h-3" />
                API Offline
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-primary bg-primary/5 border border-primary/20 px-4 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          Phase 1 — Foundation
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-foreground leading-tight tracking-tight mb-6">
          The Examination Platform
          <br />
          <span className="text-primary">Built for Institutions</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Nigrani Always delivers a complete examination management system — from question
          authoring to result publication — with security and transparency at its core.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Get Started
          </button>
          <button className="inline-flex items-center justify-center gap-2 border border-border text-foreground px-6 py-3 rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
            Learn More
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-secondary/40 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: 'Multi-Role', label: 'Access Control' },
              { value: 'Real-Time', label: 'Monitoring' },
              { value: 'Secure', label: 'Submissions' },
              { value: 'Analytics', label: 'Dashboard' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Everything an Institution Needs
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A complete suite of tools designed around the real workflow of academic examinations.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <ClipboardCheck className="w-3 h-3 text-white" />
            </div>
            <span>Nigrani Always</span>
          </div>
          <span>© 2026 Nigrani Always. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}
