import { Router, type RequestHandler } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { UnauthorizedError } from "../../../shared/errors/app-error.js";
import { authenticate as defaultAuthenticate } from "../../../shared/middlewares/authenticate.js";
import { authorizeRole } from "../../../shared/middlewares/authorize-role.js";
import { validateRequest } from "../../../shared/middlewares/validate-request.js";
import { createUserSupabaseClient } from "../../../infrastructure/supabase/user-client.factory.js";
import { FinalizeOccurrenceController } from "./occurrence.controller.js";
import { FinalizeOccurrenceUseCase } from "../application/use-cases/finalize-occurrence.use-case.js";
import { SupabaseOccurrenceRepository } from "../infrastructure/repositories/supabase-occurrence.repository.js";
import { finalizeOccurrenceSchema } from "./occurrence.schema.js";

export interface OccurrenceRoutesDeps {
  authenticate?: RequestHandler;
  adminClient: SupabaseClient;
}

export function createOccurrenceRoutes({
  authenticate = defaultAuthenticate, adminClient,
}: OccurrenceRoutesDeps): Router {
  const router = Router();
  router.post(
    "/finalize",
    authenticate,
    authorizeRole(["CITIZEN"]),
    validateRequest({ body: finalizeOccurrenceSchema.shape.body }),
    async (req, res, next) => {
      try {
        if (!req.user || !req.token) throw new UnauthorizedError();
        const repository = new SupabaseOccurrenceRepository(
          createUserSupabaseClient(req.token), adminClient,
        );
        const controller = new FinalizeOccurrenceController(
          new FinalizeOccurrenceUseCase(repository),
        );
        await controller.handle(req, res);
      } catch (error) {
        next(error);
      }
    },
  );
  return router;
}
