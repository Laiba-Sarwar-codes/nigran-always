export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'WRITTEN'
export type ExamStatus = 'DRAFT' | 'PUBLISHED'

export interface Choice {
  id: number
  text: string
  is_correct: boolean
  order_index: number
}

export interface Question {
  id: number
  uuid: string
  question_type: QuestionType
  text: string
  marks: number
  is_active: boolean
  choices: Choice[]
  created_at: string
  updated_at: string
}

export interface QuestionListResponse {
  items: Question[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface ChoiceInput {
  text: string
  is_correct: boolean
}

export interface CreateQuestionRequest {
  question_type: QuestionType
  text: string
  marks: number
  choices?: ChoiceInput[]
}

export interface UpdateQuestionRequest {
  text?: string
  marks?: number
  choices?: ChoiceInput[]
}

export interface ExamQuestion {
  id: number
  order_index: number
  question: Question
}

export interface Examination {
  id: number
  uuid: string
  title: string
  description: string | null
  duration_minutes: number | null
  total_marks: number
  passing_marks: number | null
  status: ExamStatus
  published_at: string | null
  created_at: string
  updated_at: string
  exam_questions: ExamQuestion[]
}

export interface ExamListResponse {
  items: Examination[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface CreateExamRequest {
  title: string
  description?: string
  duration_minutes?: number
  passing_marks?: number
}

export interface UpdateExamRequest {
  title?: string
  description?: string
  duration_minutes?: number
  passing_marks?: number
}
