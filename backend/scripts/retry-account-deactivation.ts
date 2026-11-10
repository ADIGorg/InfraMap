
import { createSupabaseAdminClient } from
  "../src/infrastructure/supabase/admin-client.js";

import { SupabaseAccountAuthGateway } from
  "../src/modules/identity/infrastructure/supabase-account-auth.gateway.js";

/**
 * API1-44 — ID-02
 *
 * Finaliza a anonimização de uma conta
 * que já foi desativada no PostgreSQL.
 *
 * Uso:
 *   node --env-file=.env --import=tsx
 *     ./scripts/retry-account-deactivation.ts UUID
 *
 * Para executar alterações reais:
 *   acrescentar --apply.
 */

async function main(): Promise<void> {
  const userId = process.argv[2];
  const apply = process.argv.includes("--apply");

  // Validação básica do UUID.
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!userId || !uuidPattern.test(userId)) {
    throw new Error(
      "Informe um UUID válido de uma conta desativada."
    );
  }

  const adminClient = createSupabaseAdminClient();

  // 1. Verifica se existe limpeza pendente.
  const { data: job, error: jobError } =
    await adminClient
      .from("account_deactivation_jobs")
      .select("user_id, auth_cleanup_completed_at")
      .eq("user_id", userId)
      .maybeSingle();

  if (jobError) {
    throw new Error(
      "Falha ao consultar a pendência."
    );
  }

  if (!job) {
    throw new Error(
      "Nenhuma desativação registrada para esse usuário."
    );
  }

  if (job.auth_cleanup_completed_at) {
    console.log(
      "A limpeza dessa conta já foi concluída."
    );
    return;
  }

  // 2. Confirma que a conta está inativa.
  const { data: role, error: roleError } =
    await adminClient
      .from("user_roles")
      .select("role, is_active")
      .eq("user_id", userId)
      .maybeSingle();

  if (roleError ||
      !role ||
      role.role !== "CITIZEN" ||
      role.is_active !== false) {
    throw new Error(
      "A conta não está desativada como cidadão."
    );
  }

  console.log(
    "Pendência encontrada para o usuário:",
    userId
  );

  // Sem --apply, não realiza alterações.
  if (!apply) {
    console.log(
      "Modo de verificação. Nenhuma alteração realizada."
    );
    return;
  }

  // 3. Tenta novamente a anonimização Auth.
  const authGateway =
    new SupabaseAccountAuthGateway(adminClient);

  await authGateway.anonymizeAuthUser(userId);

  // 4. Registra a conclusão.
  const { data: updated, error: updateError } =
    await adminClient
      .from("account_deactivation_jobs")
      .update({
        auth_cleanup_completed_at:
          new Date().toISOString(),
      })
      .eq("user_id", userId)
      .is("auth_cleanup_completed_at", null)
      .select("user_id")
      .maybeSingle();

  if (updateError || !updated) {
    throw new Error(
      "Anonimização realizada, mas não foi possível registrar sua conclusão."
    );
  }

  console.log(
    "Anonimização concluída com sucesso."
  );
}

main().catch((error: unknown) => {
  console.error(
    "Falha na recuperação:",
    error instanceof Error
      ? error.message
      : error
  );

  process.exitCode = 1;
});
