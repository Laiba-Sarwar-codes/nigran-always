import { apiClient } from '@/lib/api'

export interface HealthResponse {
  status: string
  service?: string
  database?: string
}

export const getHealth = () =>
  apiClient.get<HealthResponse>('/health').then((r) => r.data)

export const getReady = () =>
  apiClient.get<HealthResponse>('/ready').then((r) => r.data)
