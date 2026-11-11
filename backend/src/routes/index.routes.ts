// src/routes/index.routes.ts

import { Router } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";

import healthRoutes from "../modules/health/health.routes.js";
import { administrationRoutes } from "../modules/administration/presentation/administration.routes.js";
import { notificationsRoutes } from "../modules/notifications/presentation/notifications.routes.js";
import { votesRoutes } from "../modules/votes/presentation/votes.routes.js";

import {
  createIdentityRoutes,
  identityRouter,
} from "../modules/identity/presentation/identity.routes.js";

import {
  createProfileReader,
} from "../modules/identity/infrastructure/repositories/supabase-identity.repository.js";

import { createCategoriesRoutes } from "../modules/categories/categories.routes.js";
import { createCategoriesRepository } from "../modules/categories/categories.repository.js";

import { authenticate } from "../shared/middlewares/authenticate.js";
import { authorizeRole } from "../shared/middlewares/authorize-role.js";
import { validateRequest } from "../shared/middlewares/validate-request.js";

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


routes.use("/health", healthRoutes);
routes.use("/admin", administrationRoutes);
export interface RoutesDependencies {
  adminClient: SupabaseClient;
}

// ==========================================
// FACTORY DE ROTAS
// ==========================================

export function createRoutes(deps: RoutesDependencies): Router {
  const { adminClient } = deps;
  const routes = Router();

  const validateRouteRequest = (schema: unknown) =>
    validateRequest(schema as Parameters<typeof validateRequest>[0]);

  // ==========================================
  // HEALTH CHECK
  // ==========================================
  routes.use("/health", healthRoutes);

  // ==========================================
  // CAT-01 — CONSULTA PÚBLICA DE CATEGORIAS
  // ==========================================
  const categoriesRepository = createCategoriesRepository(supabasePublic);
  routes.use("/categories", createCategoriesRoutes(categoriesRepository));

  // ==========================================
  // ROTAS DE IDENTIDADE EXISTENTES
  // ==========================================
  routes.use("/identity", identityRouter);

  // ==========================================
  // API1-13 — IDENTIDADE DO USUÁRIO
  // ==========================================
  const identityMeRoutes = createIdentityRoutes({
    authenticate,
    authorizeRole: (role) => authorizeRole([role]),
    resolveContext: (request) => {
      if (!request.user || !request.token) {
        throw new UnauthorizedError();
      }
      const userClient = createUserSupabaseClient(request.token);
      return {
        userId: request.user.id,
        profiles: createProfileReader(userClient),
      };
    },
  });
  routes.use(identityMeRoutes);

  // ==========================================
  // MOD-01 / MOD-02 / MOD-03 / MOD-04
  // ==========================================
  const occurrenceModerationRoutes = createOccurrenceModerationRoutes({
    authenticate,
    authorizeRole,
    adminClient,
  });
  routes.use("/admin/occurrences", occurrenceModerationRoutes);

  // ==========================================
  // OCC-02 — Consultas públicas (anônimo)
  // ==========================================
  const publicOccurrenceRoutes = createPublicOccurrenceRoutes({
    adminClient,
    validateRequest: validateRouteRequest,
  });
  routes.use("/occurrences/public", publicOccurrenceRoutes);

  // ==========================================
  // OCC-02 — Consultas do cidadão (CITIZEN ou ADMIN)
  // ==========================================
  const myOccurrenceRoutes = createMyOccurrenceRoutes({
    authenticate,
    adminClient,
    validateRequest: validateRouteRequest,
  });
  routes.use("/occurrences/mine", myOccurrenceRoutes);

  // ==========================================
  // OCC-02 — Consultas administrativas (ADMIN ativo)
  // ==========================================
  const adminOccurrenceQueryRoutes = createAdminOccurrenceQueryRoutes({
    authenticate,
    authorizeRole,
    adminClient,
    validateRequest: validateRouteRequest,
  });
  routes.use("/admin/occurrences", adminOccurrenceQueryRoutes);

  // ==========================================
  // OCC-03 — Acesso autorizado às fotografias
  // ==========================================
  const photoAccessRouters = createPhotoAccessRoutes({
    authenticate,
    authorizeRole,
    adminClient,
    validateRequest: validateRouteRequest,
  });
  routes.use("/occurrences/public", photoAccessRouters.publicRouter);
  routes.use("/occurrences/mine", photoAccessRouters.myRouter);
  routes.use("/admin/occurrences", photoAccessRouters.adminRouter);

  // ==========================================
  // OCC-01 — Finalizar e registrar ocorrência
  // ==========================================
  const occurrenceCitizenRoutes = createOccurrenceRoutes({
    authenticate,
    adminClient,
  });
  routes.use("/occurrences", occurrenceCitizenRoutes);

  // ==========================================
  // VOTES — Impacto comunitário (autenticado)
  // ==========================================
  routes.use("/occurrences", votesRoutes);

  routes.use("/notifications", notificationsRoutes);

  // ==========================================
  // MOD-03 — Consulta de histórico (autor OU admin)
  //
  // ⚠️ Registrado por último para evitar ambiguidade do Express.
  // ==========================================
  const occurrenceHistoryRoutes = createOccurrenceHistoryRoutes({
    authenticate,
    adminClient,
    validateRequest: validateRouteRequest,
  });
  routes.use("/occurrences", occurrenceHistoryRoutes);

  // ==========================================
  // API1-47 / API1-48 — AI-02 / AI-03
  // ==========================================
  routes.use("/ai-analyses", aiAnalysisRoutes);
  routes.use("/ai-analyses", aiProcessingRoutes);

  return routes;
}