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
import AdminSettingsPage from '@/pages/AdminSettingsPage'
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
import ExaminerReportsPage from '@/pages/ExaminerReportsPage'
import CandidateProfilePage from '@/pages/CandidateProfilePage'
import ExamRoomRedirectPage from '@/pages/ExamRoomRedirectPage'
import AdminExamsPage from '@/pages/AdminExamsPage'
import AdminAnalyticsPage from '@/pages/AdminAnalyticsPage'
import AdminHealthPage from '@/pages/AdminHealthPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/dashboard" element={
          <ProtectedRoute><Navigate to="/" replace /></ProtectedRoute>
        } />

        {/* ── Admin ─────────────────────────────────────────────────────────── */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute roles={['ADMIN']}><AdminDashboardPage /></ProtectedRoute>
        } />
        <Route path="/admin/exams" element={
          <ProtectedRoute roles={['ADMIN']}><AdminExamsPage /></ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute roles={['ADMIN']}><UserManagementPage /></ProtectedRoute>
        } />
        <Route path="/admin/activity" element={
          <ProtectedRoute roles={['ADMIN']}><AdminActivityPage /></ProtectedRoute>
        } />
        <Route path="/admin/analytics" element={
          <ProtectedRoute roles={['ADMIN']}><AdminAnalyticsPage /></ProtectedRoute>
        } />
        <Route path="/admin/health" element={
          <ProtectedRoute roles={['ADMIN']}><AdminHealthPage /></ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute roles={['ADMIN']}><AdminSettingsPage /></ProtectedRoute>
        } />

        {/* ── Examiner ──────────────────────────────────────────────────────── */}
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
        {/* Live monitor — shows submitted attempts */}
        <Route path="/examiner/monitor" element={
          <ProtectedRoute roles={['EXAMINER']}><ExaminerSubmissionsPage /></ProtectedRoute>
        } />
        {/* Grading queue */}
        <Route path="/examiner/grading" element={
          <ProtectedRoute roles={['EXAMINER']}><ExaminerSubmissionsPage /></ProtectedRoute>
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
        <Route path="/examiner/reports" element={
          <ProtectedRoute roles={['EXAMINER']}><ExaminerReportsPage /></ProtectedRoute>
        } />

        {/* ── Candidate ─────────────────────────────────────────────────────── */}
        <Route path="/candidate/dashboard" element={
          <ProtectedRoute roles={['CANDIDATE']}><CandidateDashboardPage /></ProtectedRoute>
        } />
        <Route path="/candidate/exams" element={
          <ProtectedRoute roles={['CANDIDATE']}><CandidateExamsPage /></ProtectedRoute>
        } />
        {/* /candidate/exam-room → redirect to exams list to pick one */}
        <Route path="/candidate/exam-room" element={
          <ProtectedRoute roles={['CANDIDATE']}><ExamRoomRedirectPage /></ProtectedRoute>
        } />
        <Route path="/candidate/exam/:examId" element={
          <ProtectedRoute roles={['CANDIDATE']}><ExamWorkspacePage /></ProtectedRoute>
        } />
        <Route path="/candidate/results" element={
          <ProtectedRoute roles={['CANDIDATE']}><CandidateResultsPage /></ProtectedRoute>
        } />
        <Route path="/candidate/profile" element={
          <ProtectedRoute roles={['CANDIDATE']}><CandidateProfilePage /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
