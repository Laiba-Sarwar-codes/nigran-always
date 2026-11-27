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

        {/* Candidate */}
        <Route path="/candidate/dashboard" element={
          <ProtectedRoute roles={['CANDIDATE']}><CandidateDashboardPage /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
