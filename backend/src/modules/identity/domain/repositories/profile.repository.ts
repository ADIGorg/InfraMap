
import type {
  AccountProfile,
  UpdateAccountProfileData,
} from "../entities/account-profile.entity.js";

/**
 * Contrato para consultar e atualizar os
 * dados cadastrais de um usuário.
 *
 * A implementação concreta ficará em
 * Infrastructure, utilizando o Supabase.
 */
export interface AccountProfileRepository {
  findByUserId(
    userId: string
  ): Promise<AccountProfile | null>;

  updateByUserId(
    userId: string,
    data: UpdateAccountProfileData
  ): Promise<AccountProfile | null>;
}
