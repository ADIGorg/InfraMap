
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

import {
  createUserSupabaseClient,
} from "../infrastructure/supabase/user-client.factory.js";

import {
  supabasePublic,
} from "../infrastructure/supabase/public-client.js";

import {
  UnauthorizedError,
} from "../shared/errors/app-error.js";


import {
  aiAnalysisRoutes,
} from "../modules/ai-analysis/presentation/ai-analysis.routes.js";


import {
  aiProcessingRoutes,
} from "../modules/ai-analysis/presentation/ai-processing.routes.js";



const routes = Router();


// ==========================================
// HEALTH CHECK
// ==========================================

routes.use("/health", healthRoutes);

// ==========================================
// CAT-01 - CONSULTA PÚBLICA DE CATEGORIAS
// ==========================================

const categoriesRepository = createCategoriesRepository(
  supabasePublic
);

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

    const userClient = createUserSupabaseClient(
      request.token
    );

    return {
      userId: request.user.id,
      profiles: createProfileReader(userClient),
    };
  },
});

routes.use(identityMeRoutes);


// ==========================================
// API1-47 - AI-02
// CRIAÇÃO DE ANÁLISE E UPLOAD DE FOTOS
// ==========================================

routes.use("/ai-analyses", aiAnalysisRoutes);

// API1-48 - AI-03
routes.use("/ai-analyses", aiProcessingRoutes);


export default routes;
