import type { NotificationRepository } from "../../infrastructure/repositories/supabase-notification.repository.js";

export async function markAllNotificationsRead(repository: Pick<NotificationRepository, "markRead">) {
  await repository.markRead();
}
