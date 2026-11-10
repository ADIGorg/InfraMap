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
// Roteadores de ocorrências (MOD-01/02/03/04 + OCC-01 + OCC-02)
// ==========================================================

import {
  createOccurrenceHistoryRoutes,
} from "../presentation/routes/occurrence-history.routes.js";

import {
  createOccurrenceModerationRoutes,
} from "../presentation/routes/occurrence-moderation.routes.js";

// OCC-01
import {
  createOccurrenceRoutes,
} from "../presentation/routes/occurrence.routes.js";

// OCC-02
import {
  createPublicOccurrenceRoutes,
} from "../presentation/routes/public-occurrence.routes.js";

import {
  createMyOccurrenceRoutes,
} from "../presentation/routes/my-occurrence.routes.js";

import {
  createAdminOccurrenceQueryRoutes,
} from "../presentation/routes/admin-occurrence-query.routes.js";

const routes = Router();
const adminClient = createSupabaseAdminClient();
const validateRouteRequest = (schema: unknown) =>
  validateRequest(schema as Parameters<typeof validateRequest>[0]);

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
// OCC-02 — Consultas públicas (anônimo)
//
// Endpoints:
//   GET /occurrences/public
//   GET /occurrences/public/:id
//
// Só CONFIRMED e IN_SERVICE aparecem.
// Coordenadas aproximadas; sem dados do autor.
// ==========================================

const publicOccurrenceRoutes = createPublicOccurrenceRoutes({
  adminClient,
  validateRequest: validateRouteRequest,
});

routes.use("/occurrences/public", publicOccurrenceRoutes);

// ==========================================
// OCC-02 — Consultas do cidadão (CITIZEN ou ADMIN)
//
// Endpoints:
//   GET /occurrences/mine
//   GET /occurrences/mine/:id
//
// Cidadão vê apenas as próprias ocorrências (todos os status).
// ==========================================

const myOccurrenceRoutes = createMyOccurrenceRoutes({
  authenticate,
  adminClient,
  validateRequest: validateRouteRequest,
});

routes.use("/occurrences/mine", myOccurrenceRoutes);

// ==========================================
// OCC-02 — Consultas administrativas (ADMIN ativo)
//
// Endpoints:
//   GET /admin/occurrences
//   GET /admin/occurrences/:id
//
// Admin vê tudo, inclusive RESOLVED e REJECTED.
// No mapa (com bbox), RESOLVED não aparece como ponto ativo.
// ==========================================

const adminOccurrenceQueryRoutes = createAdminOccurrenceQueryRoutes({
  authenticate,
  authorizeRole,
  adminClient,
  validateRequest: validateRouteRequest,
});

routes.use("/admin/occurrences", adminOccurrenceQueryRoutes);

// ==========================================
// OCC-01 - Finalizar e registrar ocorrência (CITIZEN ativo)
//
// Endpoints:
//   POST /occurrences/finalize
//
// O cidadão autenticado envia os dados confirmados da análise
// (AI-03) + categoria + descrição + localização + 1..3 fotos.
// A RPC `finalize_occurrence` persiste tudo atomicamente.
// ==========================================

const occurrenceCitizenRoutes = createOccurrenceRoutes({
  authenticate,
  adminClient,
});

routes.use("/occurrences", occurrenceCitizenRoutes);

// ==========================================
// MOD-03 - Consulta de histórico (autor OU admin)
//
// Endpoints:
//   GET /occurrences/:id/history
//
// ⚠️ Registrado por último, DEPOIS das rotas específicas
// (/public, /mine, /finalize) para evitar ambiguidade do Express.
// O controle de acesso é feito DENTRO do use case.
// ==========================================

const occurrenceHistoryRoutes = createOccurrenceHistoryRoutes({
  authenticate,
  adminClient,
  validateRequest: validateRouteRequest,
});

routes.use("/occurrences", occurrenceHistoryRoutes);

export default routes;