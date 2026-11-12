import { api } from "../../shared/http";
export interface Notification { id: string; occurrence_id: string | null; title: string; message: string; read_at: string | null; created_at: string }
export const listNotifications = (page: number) => api<{
  data: Notification[]; pagination: { total_pages: number };
}>(`/notifications?page=${page}&limit=20`, { authenticated: true });
export const readNotification = (id: string) => api(`/notifications/${id}/read`, { method: "PATCH", authenticated: true });
export const readAll = () => api("/notifications/read-all", { method: "PATCH", authenticated: true });
