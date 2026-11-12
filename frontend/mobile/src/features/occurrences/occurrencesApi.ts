import { api } from "../../shared/http";
export interface Category { id: string; code: string; name: string }
export interface Occurrence {
  id: string; category: Category; description: string; status: string;
  location: { lat: number; lng: number }; votesCount: number; createdAt: string;
  photoUrls?: { url: string; position: number; expiresAt: string }[];
}
export interface HistoryEvent {
  id: string; type: string; action: string; createdAt: string;
  content?: string; details?: string;
  newData?: { status?: string }; previousData?: { status?: string };
}
export interface PageResult<T> { data: T[]; pagination: { page: number; totalPages: number } }
export const listPublic = (page = 1) => api<PageResult<Occurrence>>(`/occurrences/public?page=${page}&pageSize=100`);
export const listMine = (page = 1) => api<PageResult<Occurrence>>(`/occurrences/mine?page=${page}&pageSize=20`, { authenticated: true });
export const getOccurrence = (id: string, own: boolean) =>
  api<{ data: Occurrence }>(`/occurrences/${own ? "mine" : "public"}/${id}`, { authenticated: own });
export const getHistory = (id: string) =>
  api<{ data: HistoryEvent[] }>(`/occurrences/${id}/history`, { authenticated: true });
export const vote = (id: string, remove: boolean) =>
  api<{ data: { vote_count: number } }>(`/occurrences/${id}/votes${remove ? "/me" : ""}`,
    { authenticated: true, method: remove ? "DELETE" : "POST" });
