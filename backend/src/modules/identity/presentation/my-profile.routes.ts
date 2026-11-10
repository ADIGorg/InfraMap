
import {
  Router,
  type RequestHandler,
} from "express";

import {
  validateRequest,
} from "../../../shared/middlewares/validate-request.js";

import {
  createMyProfileController,
  type ResolveMyProfileContext,
} from "./my-profile.controller.js";

import {
  updateProfileBodySchema,
} from "./update-profile.schema.js";

interface MyProfileRoutesDependencies {
  authenticate: RequestHandler;
  resolveContext: ResolveMyProfileContext;
}

export function createMyProfileRoutes(
  dependencies: MyProfileRoutesDependencies
) {
  const router = Router();

  const controller = createMyProfileController(
    dependencies.resolveContext
  );

  // ID-01: consulta do próprio perfil.
  router.get(
    "/me",
    dependencies.authenticate,
    controller.getMe
  );

  // ID-01: atualização dos dados permitidos.
  router.patch(
    "/me",
    dependencies.authenticate,
    validateRequest({
      body: updateProfileBodySchema,
    }),
    controller.updateMe
  );

  return router;
}
