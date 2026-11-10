export type IdentityRole = "CITIZEN" | "ADMIN";

export interface UserProfile {
  id: string;
  role: IdentityRole;
  is_active: boolean;
}