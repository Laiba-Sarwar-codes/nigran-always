import axios from 'axios'
import type {
  CreateExamRequest,
  CreateQuestionRequest,
  ExamListResponse,
  Examination,
  Question,
  QuestionListResponse,
  QuestionType,
  UpdateExamRequest,
  UpdateQuestionRequest,
} from '@/types/exam'

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})

// ── Questions ─────────────────────────────────────────────────────────────────

export const questionsService = {
  list: (params?: { page?: number; per_page?: number; q?: string; question_type?: QuestionType }) =>
    api.get<QuestionListResponse>('/questions', { params }).then(r => r.data),

  create: (data: CreateQuestionRequest) =>
    api.post<Question>('/questions', data).then(r => r.data),

  get: (id: number) =>
    api.get<Question>(`/questions/${id}`).then(r => r.data),

  update: (id: number, data: UpdateQuestionRequest) =>
    api.patch<Question>(`/questions/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/questions/${id}`),
}

// ── Examinations ──────────────────────────────────────────────────────────────

export const examsService = {
  list: (params?: { page?: number; per_page?: number; status?: string }) =>
    api.get<ExamListResponse>('/exams', { params }).then(r => r.data),

  create: (data: CreateExamRequest) =>
    api.post<Examination>('/exams', data).then(r => r.data),

  get: (id: number) =>
    api.get<Examination>(`/exams/${id}`).then(r => r.data),

  update: (id: number, data: UpdateExamRequest) =>
    api.patch<Examination>(`/exams/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/exams/${id}`),

  publish: (id: number) =>
    api.post<Examination>(`/exams/${id}/publish`).then(r => r.data),

  addQuestions: (examId: number, questionIds: number[]) =>
    api.post<Examination>(`/exams/${examId}/questions`, { question_ids: questionIds }).then(r => r.data),

  removeQuestion: (examId: number, questionId: number) =>
    api.delete<Examination>(`/exams/${examId}/questions/${questionId}`).then(r => r.data),
}
