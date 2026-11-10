import { Router } from "express";

import healthRoutes from "../modules/health/health.routes.js";

import {
  createIdentityRoutes,
  identityRouter,
} from "../modules/identity/presentation/identity.routes.js";

import {
  createProfileReader,
} from "../modules/identity/infrastructure/repositories/supabase-identity.repository.js";

import {
  createCategoriesRoutes,
} from "../modules/categories/categories.routes.js";

import {
  createCategoriesRepository,
} from "../modules/categories/categories.repository.js";

import { authenticate } from "../shared/middlewares/authenticate.js";
import { authorizeRole } from "../shared/middlewares/authorize-role.js";
import { validateRequest } from "../shared/middlewares/validate-request.js";

import {
  createUserSupabaseClient,
} from "../infrastructure/supabase/user-client.factory.js";

import {
  supabasePublic,
} from "../infrastructure/supabase/public-client.js";

import {
  createSupabaseAdminClient,
} from "../infrastructure/supabase/admin-client.js";

import {
  UnauthorizedError,
} from "../shared/errors/app-error.js";

// ==========================================================
// Roteadores de ocorrências (MOD-01/02/03/04 + OCC-01)
// ==========================================================

import {
  createOccurrenceHistoryRoutes,
} from "../presentation/routes/occurrence-history.routes.js"

import {
  createOccurrenceModerationRoutes,
} from "../presentation/routes/occurrence-moderation.routes.js";

// OCC-01
import {
  createOccurrenceRoutes,
} from "../presentation/routes/occurrence.routes.js";

const routes = Router();
const adminClient = createSupabaseAdminClient();

// ==========================================
// HEALTH CHECK
// ==========================================

routes.use("/health", healthRoutes);

// ==========================================
// CAT-01 - CONSULTA PÚBLICA DE CATEGORIAS
// ==========================================

const categoriesRepository = createCategoriesRepository(supabasePublic);

routes.use(
  "/categories",
  createCategoriesRoutes(categoriesRepository)
);

// ==========================================
// ROTAS DE IDENTIDADE EXISTENTES
// ==========================================

routes.use("/identity", identityRouter);

// ==========================================
// API1-13 - IDENTIDADE DO USUÁRIO
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
// Moderação de ocorrências (somente ADMIN ativo)
//
// Endpoints:
//   PATCH  /admin/occurrences/:id/start-analysis   (MOD-01)
//   POST   /admin/occurrences/:id/confirm          (MOD-01)
//   POST   /admin/occurrences/:id/reject           (MOD-01)
//   PATCH  /admin/occurrences/:id/priority         (MOD-02)
//   POST   /admin/occurrences/:id/start-service    (MOD-02)
//   POST   /admin/occurrences/:id/resolve          (MOD-02)
//   POST   /admin/occurrences/:id/observations     (MOD-03)
//   PATCH  /admin/occurrences/:id/location         (MOD-04)
//   PATCH  /admin/occurrences/:id/classification   (MOD-04)
// ==========================================

const occurrenceModerationRoutes = createOccurrenceModerationRoutes({
  authenticate,
  authorizeRole,
  adminClient,
});

routes.use("/admin/occurrences", occurrenceModerationRoutes);

// ==========================================
// MOD-03 - Consulta de histórico (autor OU admin)
//
// Endpoints:
//   GET /occurrences/:id/history
//
// O controle de acesso é feito DENTRO do use case,
// pois aceita cidadão autor E administrador ativo.
// ==========================================

const occurrenceHistoryRoutes = createOccurrenceHistoryRoutes({
  authenticate,
  adminClient,
  validateRequest: (schema) =>
    validateRequest(schema as Parameters<typeof validateRequest>[0]),
});

routes.use("/occurrences", occurrenceHistoryRoutes);

// ==========================================
// OCC-01 - Finalizar e registrar ocorrência (CITIZEN ativo)
//
// Endpoints:
//   POST /occurrences/finalize
//
// O cidadão autenticado envia os dados confirmados da análise
// (AI-03) + categoria + descrição + localização + 1..3 fotos.
// A RPC `finalize_occurrence` persiste tudo atomicamente:
//   occurrence + photos + consumo da análise + histórico
// ==========================================

const occurrenceCitizenRoutes = createOccurrenceRoutes({
  authenticate,
  adminClient,
});

routes.use("/occurrences", occurrenceCitizenRoutes);

export default routes;