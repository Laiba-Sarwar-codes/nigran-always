import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import AdminDashboardPage from '@/pages/AdminDashboardPage'
import ExaminerDashboardPage from '@/pages/ExaminerDashboardPage'
import CandidateDashboardPage from '@/pages/CandidateDashboardPage'
import UserManagementPage from '@/pages/UserManagementPage'
import AdminActivityPage from '@/pages/AdminActivityPage'
import QuestionBankPage from '@/pages/QuestionBankPage'
import ExaminationsPage from '@/pages/ExaminationsPage'
import ExamDetailPage from '@/pages/ExamDetailPage'
import CandidateExamsPage from '@/pages/CandidateExamsPage'
import ExamWorkspacePage from '@/pages/ExamWorkspacePage'
import ExamSubmissionsPage from '@/pages/ExamSubmissionsPage'
import ExaminerSubmissionsPage from '@/pages/ExaminerSubmissionsPage'
import AttemptGradingPage from '@/pages/AttemptGradingPage'
import ExamResultsPage from '@/pages/ExamResultsPage'
import CandidateResultsPage from '@/pages/CandidateResultsPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Generic /dashboard → role redirect handled in ProtectedRoute */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              {/* This never renders; ProtectedRoute redirects to role dashboard */}
              <Navigate to="/" replace />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute roles={['ADMIN']}><AdminDashboardPage /></ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute roles={['ADMIN']}><UserManagementPage /></ProtectedRoute>
        } />
        <Route path="/admin/activity" element={
          <ProtectedRoute roles={['ADMIN']}><AdminActivityPage /></ProtectedRoute>
        } />

        {/* Examiner */}
        <Route path="/examiner/dashboard" element={
          <ProtectedRoute roles={['EXAMINER']}><ExaminerDashboardPage /></ProtectedRoute>
        } />
        <Route path="/examiner/questions" element={
          <ProtectedRoute roles={['EXAMINER']}><QuestionBankPage /></ProtectedRoute>
        } />
        <Route path="/examiner/exams" element={
          <ProtectedRoute roles={['EXAMINER']}><ExaminationsPage /></ProtectedRoute>
        } />
        <Route path="/examiner/exams/:id" element={
          <ProtectedRoute roles={['EXAMINER']}><ExamDetailPage /></ProtectedRoute>
        } />
        <Route path="/examiner/submissions" element={
          <ProtectedRoute roles={['EXAMINER']}><ExaminerSubmissionsPage /></ProtectedRoute>
        } />
        <Route path="/examiner/exams/:examId/submissions" element={
          <ProtectedRoute roles={['EXAMINER']}><ExamSubmissionsPage /></ProtectedRoute>
        } />
        <Route path="/examiner/attempts/:attemptId/grade" element={
          <ProtectedRoute roles={['EXAMINER']}><AttemptGradingPage /></ProtectedRoute>
        } />
        <Route path="/examiner/exams/:examId/results" element={
          <ProtectedRoute roles={['EXAMINER']}><ExamResultsPage /></ProtectedRoute>
        } />

        {/* Candidate */}
        <Route path="/candidate/dashboard" element={
          <ProtectedRoute roles={['CANDIDATE']}><CandidateDashboardPage /></ProtectedRoute>
        } />
        <Route path="/candidate/exams" element={
          <ProtectedRoute roles={['CANDIDATE']}><CandidateExamsPage /></ProtectedRoute>
        } />
        <Route path="/candidate/exam/:examId" element={
          <ProtectedRoute roles={['CANDIDATE']}><ExamWorkspacePage /></ProtectedRoute>
        } />
        <Route path="/candidate/results" element={
          <ProtectedRoute roles={['CANDIDATE']}><CandidateResultsPage /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
