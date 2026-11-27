export type AttemptStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED'

export interface EnrolledExam {
  id: number
  title: string
  description: string | null
  duration_minutes: number | null
  total_marks: number
  passing_marks: number | null
  attempt_status: AttemptStatus
  attempt_id: number | null
  started_at: string | null
  deadline_at: string | null
  submitted_at: string | null
}

export interface AttemptStartResponse {
  attempt_id: number
  exam_id: number
  status: AttemptStatus
  started_at: string
  deadline_at: string
}

export interface ChoiceSnapshot {
  id: number
  choice_text: string
  display_order: number
}

export interface AttemptQuestion {
  id: number
  display_order: number
  question_text: string
  question_type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'WRITTEN'
  marks: number
  choices: ChoiceSnapshot[]
}

export interface ResponseData {
  attempt_question_id: number
  selected_choice_ids: number[]
  written_text: string | null
  is_marked_for_review: boolean
}

export interface AttemptDetail {
  id: number
  exam_id: number
  status: AttemptStatus
  started_at: string
  deadline_at: string
  submitted_at: string | null
  questions: AttemptQuestion[]
  responses: Record<number, ResponseData>
}

export interface SaveResponseResult {
  attempt_question_id: number
  selected_choice_ids: number[]
  written_text: string | null
  is_marked_for_review: boolean
  version: number
  saved_at: string
}

export interface AttemptStatusResponse {
  attempt_id: number
  status: AttemptStatus
  submitted_at: string | null
}

export interface SubmitResult {
  attempt_id: number
  status: AttemptStatus
  submitted_at: string
  total_answered: number
  total_questions: number
}

export interface EnrollRequest {
  candidate_id: string
}

export interface EnrollmentResponse {
  id: number
  examination_id: number
  candidate_id: string
  enrolled_at: string
}
