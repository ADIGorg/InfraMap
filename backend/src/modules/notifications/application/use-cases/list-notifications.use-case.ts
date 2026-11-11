import type { NotificationRepository } from "../../infrastructure/repositories/supabase-notification.repository.js";

export function listNotifications(repository: Pick<NotificationRepository, "list">, page: number, limit: number) {
  return repository.list(page, limit);
}
