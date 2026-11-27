import { apiClient } from '@/lib/api'
import type { AdminStats, PaginatedActivity, ExaminerStats, CandidateSummary } from '@/types/dashboard'

export const dashboardService = {
  adminStats: () =>
    apiClient.get<AdminStats>('/dashboard/admin/stats').then((r) => r.data),

  adminActivity: (page = 1, page_size = 20) =>
    apiClient.get<PaginatedActivity>('/dashboard/admin/activity', { params: { page, page_size } }).then((r) => r.data),

  examinerStats: () =>
    apiClient.get<ExaminerStats>('/dashboard/examiner/stats').then((r) => r.data),

  examinerRecentExams: () =>
    apiClient.get<{ items: unknown[]; total: number }>('/dashboard/examiner/recent-exams').then((r) => r.data),

  candidateSummary: () =>
    apiClient.get<CandidateSummary>('/dashboard/candidate/summary').then((r) => r.data),

  candidateRecentExams: () =>
    apiClient.get<{ items: unknown[]; total: number }>('/dashboard/candidate/recent-exams').then((r) => r.data),

  candidateResults: () =>
    apiClient.get<{ items: unknown[]; total: number }>('/dashboard/candidate/results').then((r) => r.data),
}
