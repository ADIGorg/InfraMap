import type {
  NotificationRepository,
} from '../../infrastructure/repositories/supabase-notification.repository.js';

type UnreadRepository = Pick<
  NotificationRepository,
  'countUnread'
>;

export async function countUnreadNotifications(
  repository: UnreadRepository,
): Promise<number> {
  return repository.countUnread();
}