// src/routes/index.routes.ts

import { Router } from "express";

import healthRoutes from "../modules/health/health.routes.js";
import { administrationRoutes } from "../modules/administration/presentation/administration.routes.js";
import { notificationsRoutes } from "../modules/notifications/presentation/notifications.routes.js";
import { votesRoutes } from "../modules/votes/presentation/votes.routes.js";
import { createForwardingsRoutes } from "../modules/forwardings/forwardings.routes.js";

import {
  createIdentityRoutes,
  identityRouter,
} from "../modules/identity/presentation/identity.routes.js";

import { createMyProfileRoutes } from "../modules/identity/presentation/my-profile.routes.js";

import { createProfileReader } from "../modules/identity/infrastructure/repositories/supabase-identity.repository.js";
import { createAccountProfileRepository } from "../modules/identity/infrastructure/repositories/supabase-account-profile.repository.js";

import { createCategoriesRoutes } from "../modules/categories/categories.routes.js";
import { createCategoriesRepository } from "../modules/categories/categories.repository.js";

import { authenticate } from "../shared/middlewares/authenticate.js";
import { authorizeRole } from "../shared/middlewares/authorize-role.js";

import { createUserSupabaseClient } from "../infrastructure/supabase/user-client.factory.js";
import { supabasePublic } from "../infrastructure/supabase/public-client.js";

import { UnauthorizedError } from "../shared/errors/app-error.js";

import { createOccurrenceHistoryRoutes } from "../modules/occurrences/presentation/occurrence-history.routes.js";
import { createOccurrenceModerationRoutes } from "../modules/moderation/presentation/occurrence-moderation.routes.js";
import { createOccurrenceRoutes } from "../modules/occurrences/presentation/occurrence.routes.js";
import { createPublicOccurrenceRoutes } from "../modules/occurrences/presentation/public-occurrence.routes.js";
import { createMyOccurrenceRoutes } from "../modules/occurrences/presentation/my-occurrence.routes.js";
import { createAdminOccurrenceQueryRoutes } from "../modules/occurrences/presentation/admin-occurrence-query.routes.js";
import { createPhotoAccessRoutes } from "../modules/occurrences/presentation/photo-access.routes.js";

import { aiAnalysisRoutes } from "../modules/ai-analysis/presentation/ai-analysis.routes.js";
import { aiProcessingRoutes } from "../modules/ai-analysis/presentation/ai-processing.routes.js";

// ==========================================
// FACTORY DE ROTAS
// ==========================================
// Nenhuma dependência externa: cada router cria os clientes
// Supabase por requisição, com o JWT certo no contexto certo.
// ==========================================
export function createRoutes(): Router {
  const routes = Router();

  // ==========================================
  // HEALTH CHECK
  // ==========================================
  routes.use("/health", healthRoutes);

  // ==========================================
  // CAT-01 — CONSULTA PÚBLICA DE CATEGORIAS
  // ==========================================
  routes.use(
    "/categories",
    createCategoriesRoutes(createCategoriesRepository(supabasePublic)),
  );

  // ==========================================
  // ID-01 — PERFIL (GET /identity/me, PATCH /identity/me)
  //
  // ⚠️ DEVE vir ANTES de `identityRouter` (legacy): o legacy
  // tem um stub `GET /me` que sombrearia o perfil real se
  // fosse registrado primeiro. O `DELETE /identity/me` fica
  // fora daqui — é montado em `app.ts` via `deactivateMyAccountRouter`.
  // ==========================================
  routes.use(
    "/identity",
    createMyProfileRoutes({
      authenticate,
      resolveContext: (request) => {
        if (!request.user || !request.token) throw new UnauthorizedError();
        const userClient = createUserSupabaseClient(request.token);
        return {
          userId: request.user.id,
          email: request.user.email ?? null,
          accountProfiles: createAccountProfileRepository(userClient),
          identities: createProfileReader(userClient),
        };
      },
    }),
  );

  // ==========================================
  // IDENTITY — rotas legadas (`/users`, `/users/:id`, `/admin-check`)
  //
  // ⚠️ `GET /me` aqui está SHADOWED por `my-profile.routes.ts`.
  // Stub legado; será removido numa próxima passada.
  // ==========================================
  routes.use("/identity", identityRouter);

  // ==========================================
  // API1-13 — IDENTIDADE AUTENTICADA (`/app/me`, `/admin/me`)
  // ==========================================
  routes.use(
    createIdentityRoutes({
      authenticate,
      authorizeRole: (role) => authorizeRole([role]),
      resolveContext: (request) => {
        if (!request.user || !request.token) throw new UnauthorizedError();
        return {
          userId: request.user.id,
          profiles: createProfileReader(createUserSupabaseClient(request.token)),
        };
      },
    }),
  );

  // ==========================================
  // OCC-01 — FINALIZAR OCORRÊNCIA (cidadão)
  // ==========================================
  routes.use("/occurrences", createOccurrenceRoutes());

  // ==========================================
  // OCC-02 — CONSULTAS DO CIDADÃO (autenticado)
  // ==========================================
  routes.use("/occurrences/mine", createMyOccurrenceRoutes());

  // ==========================================
  // OCC-02 — CONSULTAS PÚBLICAS (anônimo)
  // ==========================================
  routes.use("/occurrences/public", createPublicOccurrenceRoutes());

  // ==========================================
  // OCC-02 — CONSULTAS ADMINISTRATIVAS (ADMIN)
  // ==========================================
  routes.use("/admin/occurrences", createAdminOccurrenceQueryRoutes());

  // ==========================================
  // OCC-03 — FOTOS (3 variantes: público, autor, admin)
  // ==========================================
  const photoAccess = createPhotoAccessRoutes();
  routes.use("/occurrences/public", photoAccess.publicRouter);
  routes.use("/occurrences/mine", photoAccess.myRouter);
  routes.use("/admin/occurrences", photoAccess.adminRouter);

  // ==========================================
  // MOD-01..04 — TRANSIÇÕES ADMINISTRATIVAS
  // ==========================================
  routes.use(
    "/admin/occurrences",
    createOccurrenceModerationRoutes({
      authenticate,
      authorizeRole,
      createUserClient: createUserSupabaseClient,
    }),
  );

  // ==========================================
  // FWD-02 — ENCAMINHAMENTO A ÓRGÃOS
  // ==========================================
  routes.use("/admin/occurrences", createForwardingsRoutes());
    
  // ==========================================
  // MOD-03 — HISTÓRICO (autor OU admin; decide no use case)
  // ==========================================
  routes.use("/occurrences", createOccurrenceHistoryRoutes());

  // ==========================================
  // VOTES — IMPACTO COMUNITÁRIO
  // ==========================================
  routes.use("/occurrences", votesRoutes);

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  routes.use("/notifications", notificationsRoutes);

  // ==========================================
  // ADMINISTRATION (dashboard + admins + agencies)
  // ==========================================
  routes.use("/admin", administrationRoutes);

  // ==========================================
  // AI-02 / AI-03 — ANÁLISE DE FOTOGRAFIAS
  // ==========================================
  routes.use("/ai-analyses", aiAnalysisRoutes);
  routes.use("/ai-analyses", aiProcessingRoutes);

  return routes;
}