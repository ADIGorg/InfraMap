import { http } from '@/infrastructure/api/http-client';
import type {
  NotificationsResponse,
  UnreadNotificationsResponse,
} from '@/shared/types/notifications';

export async function getNotifications(
  page = 1,
  limit = 20,
): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  return http<NotificationsResponse>(
    `/notifications?${params.toString()}`,
    { raw: true },
  );
}

export async function getUnreadCount(): Promise<number> {
  const response = await http<UnreadNotificationsResponse>(
    '/notifications/unread-count',
  );
  return response.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await http<void>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead(): Promise<void> {
  await http<void>('/notifications/read-all', { method: 'PATCH' });
}
