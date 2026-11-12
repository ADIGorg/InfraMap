import { api, clearSession, logout, updatePassword } from "../../shared/http";
export interface Profile { id: string; name: string; email: string | null; phone: string | null }
export const getProfile = () => api<{ data: Profile }>("/identity/me", { authenticated: true });
export const updateProfile = (name: string, phone: string) =>
  api("/identity/me", { authenticated: true, method: "PATCH", body: { name: name.trim(), phone: phone.trim() || null } });
export async function deleteProfile() {
  await api("/identity/me", { authenticated: true, method: "DELETE" });
  await clearSession();
}
export { logout, updatePassword };
