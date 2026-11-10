
import {
  Router,
  type RequestHandler,
} from "express";

import { UnauthorizedError } from
  "../../../shared/errors/app-error.js";

import { authenticate } from
  "../../../shared/middlewares/authenticate.js";

import { createUserSupabaseClient } from
  "../../../infrastructure/supabase/user-client.factory.js";

import { createSupabaseAdminClient } from
  "../../../infrastructure/supabase/admin-client.js";

import { DeactivateMyAccountUseCase } from
  "../application/use-cases/deactivate-my-account.use-case.js";

import { SupabaseAccountDeactivationRepository } from
  "../infrastructure/repositories/supabase-account-deactivation.repository.js";

import { SupabaseAccountAuthGateway } from
  "../infrastructure/supabase-account-auth.gateway.js";

import type { ProfileReader } from
  "../domain/repositories/identity.repository.js";

/**
 * Cria a rota de desativação.
 *
 * A injeção de dependências permite testar
 * a rota sem acessar o Supabase real.
 */
export function createDeactivateMyAccountRouter(
  authentication: RequestHandler,
  execute: (
    userId: string | undefined,
    accessToken: string | undefined
  ) => Promise<void>
) {
  const router = Router();

  router.delete(
    "/identity/me",
    authentication,
    async (req, res, next) => {
      try {
        await execute(
          req.user?.id,
          req.token
        );

        return res.status(204).send();
      } catch (error) {
        return next(error);
      }
    }
  );

  return router;
}

/**
 * Composição para o ambiente real.
 *
 * Os clientes administrativos são criados
 * somente durante uma requisição autenticada.
 */
export const deactivateMyAccountRouter =
  createDeactivateMyAccountRouter(
    authenticate,

    async (userId, accessToken) => {
      if (!userId || !accessToken) {
        throw new UnauthorizedError();
      }

      const userClient =
        createUserSupabaseClient(accessToken);

      // Consulta a identidade usando o JWT
      // e respeitando as políticas RLS.
      const identities: ProfileReader = {
        async findByUserId(lookupId) {
          const { data, error } = await userClient
            .from("user_roles")
            .select("user_id, role, is_active")
            .eq("user_id", lookupId)
            .maybeSingle();

          if (error) {
            throw new Error(
              "Não foi possível consultar a identidade."
            );
          }

          if (!data) {
            return null;
          }

          if (
            data.role !== "CITIZEN" &&
            data.role !== "ADMIN"
          ) {
            return null;
          }

          return {
            id: data.user_id,
            role: data.role,
            is_active: data.is_active,
          };
        },
      };

      // Cliente privilegiado somente no backend.
      const adminClient =
        createSupabaseAdminClient();

      const accounts =
        new SupabaseAccountDeactivationRepository(
          createUserSupabaseClient,
          adminClient
        );

      const authGateway =
        new SupabaseAccountAuthGateway(
          adminClient
        );

      const useCase =
        new DeactivateMyAccountUseCase(
          identities,
          accounts,
          authGateway
        );

      await useCase.execute(
        userId,
        accessToken
      );
    }
  );
