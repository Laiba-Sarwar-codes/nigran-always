import type { Role } from '@/types/auth'

export function dashboardPathForRole(role: Role): string {
  switch (role) {
    case 'ADMIN': return '/admin/dashboard'
    case 'EXAMINER': return '/examiner/dashboard'
    case 'CANDIDATE': return '/candidate/dashboard'
  }
}
