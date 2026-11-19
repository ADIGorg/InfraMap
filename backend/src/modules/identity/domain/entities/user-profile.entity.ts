export type IdentityRole = "CITIZEN" | "ADMIN";
export type AdminLevel = "MASTER" | "OPERATIONAL";

export interface UserProfile {
  id: string;
  role: IdentityRole;
  is_active: boolean;
  /** Somente para ADMIN; origem: public.user_roles (nunca claims JWT). */
  admin_level?: AdminLevel | null;
}