
import {
  Router,
  type RequestHandler,
} from "express";

import {
  createIdentityController,
  type ResolveIdentityContext,
} from "./identity.controller.js";

import type {
  IdentityRole,
} from "./identity.service.js";

interface IdentityRoutesDependencies {
  authenticate: RequestHandler;

  authorizeRole: (
    role: IdentityRole
  ) => RequestHandler;

  resolveContext: ResolveIdentityContext;
}

export function createIdentityRoutes(
  dependencies: IdentityRoutesDependencies
) {
  const router = Router();

  const controller = createIdentityController(
    dependencies.resolveContext
  );

  // Identificação do cidadão autenticado.
  router.get(
    "/app/me",
    dependencies.authenticate,
    dependencies.authorizeRole("CITIZEN"),
    controller.appMe
  );

  // Identificação do administrador autenticado.
  router.get(
    "/admin/me",
    dependencies.authenticate,
    dependencies.authorizeRole("ADMIN"),
    controller.adminMe
  );

  return router;
}
