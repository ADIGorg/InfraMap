
import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  AccountDeactivationRepository,
} from "../../domain/repositories/account-deactivation.repository.js";

/**
 * API1-44 — ID-02
 *
 * Repositório responsável pela desativação
 * e anonimização da conta no PostgreSQL.
 */
export class SupabaseAccountDeactivationRepository
  implements AccountDeactivationRepository {

  constructor(
    private readonly createUserClient: (
      accessToken: string
    ) => SupabaseClient,

    private readonly adminClient: SupabaseClient
  ) {}

  /**
   * Executa a função SQL de desativação.
   *
   * A função usa auth.uid() para identificar
   * o cidadão autenticado.
   */
  async deactivateAndAnonymize(
    userId: string,
    accessToken: string
  ): Promise<void> {
    if (!userId || !accessToken) {
      throw new Error(
        "Identificação ou autenticação ausente."
      );
    }

    const client = this.createUserClient(
      accessToken
    );

    const { error } = await client.rpc(
      "deactivate_my_account"
    );

    if (error) {
      throw new Error(
        "Não foi possível desativar e anonimizar a conta."
      );
    }
  }

  /**
   * Marca a limpeza do Supabase Auth
   * como concluída.
   */
  async markAuthCleanupCompleted(
    userId: string
  ): Promise<void> {
    const { data, error } = await this.adminClient
      .from("account_deactivation_jobs")
      .update({
        auth_cleanup_completed_at:
          new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select("user_id")
      .maybeSingle();

    if (error || !data) {
      throw new Error(
        "Não foi possível concluir o registro de desativação."
      );
    }
  }
}
