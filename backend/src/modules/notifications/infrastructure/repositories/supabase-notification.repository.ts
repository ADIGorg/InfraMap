import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../../../shared/errors/app-error.js";
import type { Notification } from "../../domain/entities/notification.entity.js";

const columns = "id, occurrence_id, title, message, type, read_at, created_at";

export function createNotificationRepository(client: SupabaseClient, userId: string) {
  return {
    async list(page: number, limit: number) {
      const offset = (page - 1) * limit;
      const { data, count, error } = await client.from("notifications")
        .select(columns, { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + limit - 1)
        .returns<Notification[]>();

      if (error) throw new AppError(500, "INTERNAL_SERVER_ERROR", "Não foi possível consultar as notificações.");
      const total = count ?? 0;
      return { data, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } };
    },

    async markRead(id?: string) {
      const unread = client.from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("read_at", null);

      const { error } = await (id ? unread.eq("id", id) : unread);
      if (error) throw new AppError(500, "INTERNAL_SERVER_ERROR", "Não foi possível marcar a notificação como lida.");

      if (!id) return true;
      const { data, error: lookupError } = await client.from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("id", id)
        .maybeSingle();

      if (lookupError) throw new AppError(500, "INTERNAL_SERVER_ERROR", "Não foi possível consultar a notificação.");
      return data !== null;
    },
  };
}

export type NotificationRepository = ReturnType<typeof createNotificationRepository>;
