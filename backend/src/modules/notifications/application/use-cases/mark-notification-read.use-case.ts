import type { NotificationRepository } from "../../infrastructure/repositories/supabase-notification.repository.js";
import { NotFoundError } from "../../../../shared/errors/app-error.js";

export async function markNotificationRead(repository: Pick<NotificationRepository, "markRead">, id: string) {
  if (!(await repository.markRead(id))) throw new NotFoundError("Notificação não encontrada.");
}
