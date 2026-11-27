import { apiClient } from '@/lib/api'
import type { User, LoginRequest, RegisterRequest, TokenResponse, UserListResponse } from '@/types/auth'

export const authService = {
  register: (data: RegisterRequest) =>
    apiClient.post<User>('/auth/register', data).then((r) => r.data),

  login: (data: LoginRequest) =>
    apiClient.post<TokenResponse>('/auth/login', data).then((r) => r.data),

  logout: () => apiClient.post('/auth/logout').then(() => {}),

  refresh: () => apiClient.post<TokenResponse>('/auth/refresh').then((r) => r.data),

  me: () => apiClient.get<User>('/auth/me').then((r) => r.data),
}

export const adminService = {
  createUser: (data: { full_name: string; email: string; password: string; role: string }) =>
    apiClient.post<User>('/admin/users', data).then((r) => r.data),

  listUsers: (params?: { page?: number; page_size?: number; search?: string; role?: string; is_active?: boolean }) =>
    apiClient.get<UserListResponse>('/admin/users', { params }).then((r) => r.data),

  getUser: (id: string) => apiClient.get<User>(`/admin/users/${id}`).then((r) => r.data),

  patchUser: (id: string, data: { full_name?: string; email?: string }) =>
    apiClient.patch<User>(`/admin/users/${id}`, data).then((r) => r.data),

  setStatus: (id: string, is_active: boolean) =>
    apiClient.patch<User>(`/admin/users/${id}/status`, { is_active }).then((r) => r.data),
}
