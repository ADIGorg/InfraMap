
/**
 * Dados cadastrais armazenados em public.profiles.
 *
 * A autenticação e os papéis de usuário são
 * gerenciados separadamente.
 */
export interface AccountProfile {
  id: string;
  name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Campos que podem ser alterados pelo usuário.
 *
 * id, email, role, admin_level e is_active
 * não fazem parte deste contrato.
 */
export interface UpdateAccountProfileData {
  name?: string;
  phone?: string | null;
}
