import { Router } from "express";

import healthRoutes from "../modules/health/health.routes.js";

import {
  createIdentityRoutes,
  identityRouter,
} from "../modules/identity/identity.routes.js";

import { createProfileReader } from "../modules/identity/identity.repository.js";

import { authenticate } from "../shared/middlewares/authenticate.js";
import { authorizeRole } from "../shared/middlewares/authorize-role.js";

import { createUserSupabaseClient } from "../infrastructure/supabase/user-client.factory.js";

import { UnauthorizedError } from "../shared/errors/app-error.js";

const routes = Router();

routes.use("/health", healthRoutes);

// Preserva as rotas anteriores.
routes.use("/identity", identityRouter);

// Registra os novos endpoints do API-13.
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

export default routes;