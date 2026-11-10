
import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  AccountAuthGateway,
} from "../domain/repositories/account-deactivation.repository.js";

/**
 * API1-44 — ID-02
 *
 * Executa operações administrativas de
 * anonimização e revogação de sessões.
 */
export class SupabaseAccountAuthGateway
  implements AccountAuthGateway {

  constructor(
    private readonly adminClient: SupabaseClient
  ) {}

  /**
   * Revoga os refresh tokens das sessões
   * do usuário em todos os dispositivos.
   */
  async revokeSessions(
    accessToken: string
  ): Promise<void> {
    const { error } =
      await this.adminClient.auth.admin.signOut(
        accessToken,
        "global"
      );

    if (error) {
      throw new Error(
        "Não foi possível revogar as sessões do usuário."
      );
    }
  }

  /**
   * Anonimiza os principais dados pessoais
   * mantidos no Supabase Auth.
   *
   * O UUID é preservado para manter
   * os relacionamentos e o histórico.
   */
  async anonymizeAuthUser(
    userId: string
  ): Promise<void> {
    const anonymousEmail =
      `deleted+${userId}@example.invalid`;

    const { data, error } =
      await this.adminClient.auth.admin.updateUserById(
        userId,
        {
          email: anonymousEmail,
          phone: "",

          user_metadata: {
            name: "Usuário excluído",
            full_name: null,
            phone: null,
            email: null,
            avatar_url: null,
          },

          // Impede novas autenticações da conta.
          ban_duration: "876000h",
        }
      );

    if (error || !data.user) {
      throw new Error(
        "Não foi possível anonimizar o usuário no Supabase Auth."
      );
    }
  }
}
