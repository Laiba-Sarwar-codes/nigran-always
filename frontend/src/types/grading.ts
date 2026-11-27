export type GradingStatus = 'AUTO' | 'PENDING' | 'GRADED'
export type ResultStatus = 'PASS' | 'FAIL'
export type PublicationStatus = 'PENDING' | 'GRADED' | 'PUBLISHED'

export interface GradedResponse {
  id: number
  attempt_question_id: number
  awarded_marks: number | null
  grading_status: GradingStatus | null
  examiner_feedback: string | null
  graded_at: string | null
}

export interface GradingQuestion {
  id: number
  display_order: number
  question_text: string
  question_type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'WRITTEN'
  marks: number
  choices: Array<{ id: number; choice_text: string; is_correct: boolean; display_order: number }>
  response: (GradedResponse & {
    selected_choice_ids: number[]
    written_text: string | null
  }) | null
}

export interface AttemptGradingOut {
  attempt_id: number
  exam_id: number
  exam_title: string
  candidate_name: string
  candidate_email: string
  submitted_at: string
  questions: GradingQuestion[]
}

export interface SubmissionSummary {
  attempt_id: number
  candidate_name: string
  candidate_email: string
  submitted_at: string
  total_questions: number
  auto_graded: number
  pending_manual: number
  manual_graded: number
  publication_status: PublicationStatus | null
}

export interface FinalizeGradingOut {
  attempt_id: number
  total_marks: number
  obtained_marks: number
  percentage: number
  result_status: ResultStatus | null
  publication_status: PublicationStatus
}

export interface PublishResultOut {
  result_id: number
  publication_status: PublicationStatus
  published_at: string | null
}

export interface ResultSummary {
  result_id: number
  candidate_name: string
  candidate_email: string
  total_marks: number
  obtained_marks: number
  percentage: number
  result_status: ResultStatus | null
  publication_status: PublicationStatus
  published_at: string | null
}

// Candidate-facing
export interface CandidateResultSummary {
  result_id: number
  exam_title: string
  total_marks: number
  obtained_marks: number
  percentage: number
  result_status: ResultStatus
  published_at: string
}

export interface CandidateResultQuestion {
  question_text: string
  question_type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'WRITTEN'
  marks: number
  awarded_marks: number | null
  examiner_feedback: string | null
}

export interface CandidateResultDetail {
  result_id: number
  exam_title: string
  total_marks: number
  obtained_marks: number
  percentage: number
  passing_marks: number | null
  result_status: ResultStatus
  published_at: string
  questions: CandidateResultQuestion[]
}

export interface GradeResponseRequest {
  awarded_marks: number
  feedback?: string
}
