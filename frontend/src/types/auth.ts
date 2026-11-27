export type Role = 'ADMIN' | 'EXAMINER' | 'CANDIDATE'

export interface User {
  id: string
  full_name: string
  email: string
  role: Role
  is_active: boolean
  is_verified: boolean
  created_at: string
  last_login_at: string | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  full_name: string
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface UserListResponse {
  items: User[]
  total: number
  page: number
  page_size: number
}
