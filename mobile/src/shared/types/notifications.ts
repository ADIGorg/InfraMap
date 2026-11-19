export type NotificationType =
  | 'OCCURRENCE_STATUS_CHANGED'
  | 'CITIZEN_RESPONSE';

export interface AppNotification {
  id: string;
  occurrence_id: string | null;
  title: string;
  message: string;
  type: NotificationType;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface NotificationsResponse {
  data: AppNotification[];
  pagination: NotificationsPagination;
}

export interface UnreadNotificationsResponse {
  count: number;
}