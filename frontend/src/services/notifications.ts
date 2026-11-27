import axios from 'axios'
import type { Notification, UnreadCountResponse } from '../types/notifications'

const api = axios.create({ baseURL: '/api/v1', withCredentials: true })

export const getNotifications = (params?: { limit?: number; offset?: number }) =>
  api.get<Notification[]>('/notifications', { params }).then(r => r.data)

export const getUnreadCount = () =>
  api.get<UnreadCountResponse>('/notifications/unread-count').then(r => r.data)

export const markRead = (id: string) =>
  api.patch<Notification>(`/notifications/${id}/read`).then(r => r.data)

export const markAllRead = () =>
  api.patch<{ marked_count: number }>('/notifications/read-all').then(r => r.data)

export const deleteNotification = (id: string) =>
  api.delete(`/notifications/${id}`)
