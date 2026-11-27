import axios from 'axios'
import type {
  SubmissionSummary,
  AttemptGradingOut,
  GradedResponse,
  FinalizeGradingOut,
  PublishResultOut,
  ResultSummary,
  CandidateResultSummary,
  CandidateResultDetail,
  GradeResponseRequest,
} from '../types/grading'

const api = axios.create({ baseURL: '/api/v1', withCredentials: true })

// Examiner
export const getSubmissions = (examId: number) =>
  api.get<SubmissionSummary[]>(`/examiner/exams/${examId}/submissions`).then(r => r.data)

export const getAttemptGrading = (attemptId: number) =>
  api.get<AttemptGradingOut>(`/examiner/attempts/${attemptId}/grading`).then(r => r.data)

export const gradeResponse = (attemptId: number, responseId: number, body: GradeResponseRequest) =>
  api.put<GradedResponse>(`/examiner/attempts/${attemptId}/responses/${responseId}/grade`, body).then(r => r.data)

export const finalizeGrading = (attemptId: number) =>
  api.post<FinalizeGradingOut>(`/examiner/attempts/${attemptId}/finalize-grading`).then(r => r.data)

export const getExamResults = (examId: number) =>
  api.get<ResultSummary[]>(`/examiner/exams/${examId}/results`).then(r => r.data)

export const publishResult = (attemptId: number) =>
  api.post<PublishResultOut>(`/examiner/attempts/${attemptId}/publish-result`).then(r => r.data)

// Candidate
export const getCandidateResults = () =>
  api.get<CandidateResultSummary[]>('/candidate/results').then(r => r.data)

export const getCandidateResultDetail = (resultId: number) =>
  api.get<CandidateResultDetail>(`/candidate/results/${resultId}`).then(r => r.data)
