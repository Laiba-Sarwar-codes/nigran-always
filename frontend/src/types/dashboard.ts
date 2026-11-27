export interface AdminStats {
  total_users: number
  candidates: number
  examiners: number
  active_users: number
  total_examinations: number
  published_examinations: number
}

export interface ActivityItem {
  id: string
  action: string
  resource_type: string | null
  resource_id: string | null
  actor_name: string | null
  actor_email: string | null
  created_at: string
}

export interface PaginatedActivity {
  items: ActivityItem[]
  total: number
  page: number
  page_size: number
}

export interface ExaminerStats {
  total_examinations: number
  published_examinations: number
  draft_examinations: number
  total_questions: number
  enrolled_candidates: number
}

export interface CandidateSummary {
  assigned_examinations: number
  upcoming_examinations: number
  completed_examinations: number
  published_results: number
}
