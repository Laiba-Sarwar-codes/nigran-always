export type NotificationType = 'EXAM_ASSIGNED' | 'EXAM_SUBMITTED' | 'RESULT_PUBLISHED' | 'GRADING_PENDING' | 'GENERAL'

export interface Notification {
  id: string
  title: string
  message: string
  notification_type: NotificationType
  is_read: boolean
  created_at: string
  read_at: string | null
  related_entity_id: string | null
  related_entity_type: string | null
}

export interface UnreadCountResponse {
  unread_count: number
}
