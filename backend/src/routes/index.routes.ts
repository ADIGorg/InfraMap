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
// Roteadores de ocorrências (MOD-01/02/03/04 + OCC-01/02/03)
// ==========================================================

import {
  createOccurrenceHistoryRoutes,
} from "../modules/occurrences/presentation/occurrence-history.routes.js";

import {
  createOccurrenceModerationRoutes,
} from "../modules/moderation/presentation/occurrence-moderation.routes.js";

// OCC-01
import {
  createOccurrenceRoutes,
} from "../modules/occurrences/presentation/occurrence.routes.js";

// OCC-02
import {
  createPublicOccurrenceRoutes,
} from "../modules/occurrences/presentation/public-occurrence.routes.js";

import {
  createMyOccurrenceRoutes,
} from "../modules/occurrences/presentation/my-occurrence.routes.js";

import {
  createAdminOccurrenceQueryRoutes,
} from "../modules/occurrences/presentation/admin-occurrence-query.routes.js";

// OCC-03
import {
  createPhotoAccessRoutes,
} from "../modules/occurrences/presentation/photo-access.routes.js";

import {
  aiAnalysisRoutes,
} from "../modules/ai-analysis/presentation/ai-analysis.routes.js";


import {
  aiProcessingRoutes,
} from "../modules/ai-analysis/presentation/ai-processing.routes.js";



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
//
// Serviço de URLs assinadas com expiração curta.
// Bucket privado (storage_path em occurrence_photos).
//
//   GET /occurrences/public/:id/photos/:photoId          (anônimo — só CONFIRMED/IN_SERVICE)
//   GET /occurrences/mine/:id/photos/:photoId            (CITIZEN autor)
//   GET /admin/occurrences/:id/photos/:photoId           (ADMIN ativo)
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
// OCC-01 - Finalizar e registrar ocorrência (CITIZEN ativo)
//
// Endpoints:
//   POST /occurrences/finalize
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
// ==========================================

const occurrenceHistoryRoutes = createOccurrenceHistoryRoutes({
  authenticate,
  adminClient,
  validateRequest: validateRouteRequest,
});

routes.use("/occurrences", occurrenceHistoryRoutes);

// ==========================================
// API1-47 - AI-02
// CRIAÇÃO DE ANÁLISE E UPLOAD DE FOTOS
// ==========================================

routes.use("/ai-analyses", aiAnalysisRoutes);

// API1-48 - AI-03
routes.use("/ai-analyses", aiProcessingRoutes);


export default routes;
