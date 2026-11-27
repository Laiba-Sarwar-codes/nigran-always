import api from './api'
import type {
  EnrolledExam,
  AttemptStartResponse,
  AttemptDetail,
  SaveResponseResult,
  SubmitResult,
  EnrollRequest,
  EnrollmentResponse,
} from '../types/candidate'

export const candidateService = {
  listMyExams: () => api.get<EnrolledExam[]>('/candidate/my-exams').then(r => r.data),

  getMyExam: (examId: number) =>
    api.get<EnrolledExam>(`/candidate/my-exams/${examId}`).then(r => r.data),

  startAttempt: (examId: number) =>
    api.post<AttemptStartResponse>(`/candidate/my-exams/${examId}/start`).then(r => r.data),

  getAttempt: (attemptId: number) =>
    api.get<AttemptDetail>(`/candidate/attempts/${attemptId}`).then(r => r.data),

  saveResponse: (
    attemptId: number,
    aqId: number,
    data: { selected_choice_ids: number[]; written_text?: string | null },
  ) =>
    api
      .put<SaveResponseResult>(`/candidate/attempts/${attemptId}/questions/${aqId}/response`, data)
      .then(r => r.data),

  toggleReviewFlag: (attemptId: number, aqId: number, marked: boolean) =>
    api
      .patch<SaveResponseResult>(`/candidate/attempts/${attemptId}/questions/${aqId}/review`, { marked })
      .then(r => r.data),

  submitAttempt: (attemptId: number) =>
    api.post<SubmitResult>(`/candidate/attempts/${attemptId}/submit`).then(r => r.data),
}

export const enrollmentService = {
  enroll: (examId: number, body: EnrollRequest) =>
    api.post<EnrollmentResponse>(`/candidate/exams/${examId}/enroll`, body).then(r => r.data),

  listEnrollments: (examId: number) =>
    api.get<EnrollmentResponse[]>(`/candidate/exams/${examId}/enrollments`).then(r => r.data),
}
