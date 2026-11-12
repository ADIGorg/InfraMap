import { Router, type RequestHandler } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { UnauthorizedError } from "../../../shared/errors/app-error.js";
import { validateRequest } from "../../../shared/middlewares/validate-request.js";
import { createUserSupabaseClient } from "../../../infrastructure/supabase/user-client.factory.js";
import { OccurrenceModerationController } from "./occurrence-moderation.controller.js";
import { SupabaseOccurrenceModerationRepository } from "../infrastructure/repositories/supabase-moderation.repository.js";
import { StartAnalysisUseCase } from "../application/use-cases/start-analysis.use-case.js";
import { ConfirmOccurrenceUseCase } from "../application/use-cases/confirm-occurrence.use-case.js";
import { RejectOccurrenceUseCase } from "../application/use-cases/reject-occurrence.use-case.js";
import { SetPriorityUseCase } from "../application/use-cases/set-priority.use-case.js";
import { StartServiceUseCase } from "../application/use-cases/start-service.use-case.js";
import { ResolveOccurrenceUseCase } from "../application/use-cases/resolve-occurrence.use-case.js";
import { CreateObservationUseCase } from "../application/use-cases/create-observation.use-case.js";
import { AdjustLocationUseCase } from "../application/use-cases/adjust-location.use-case.js";
import { CorrectClassificationUseCase } from "../application/use-cases/correct-classification.use-case.js";
import {
  rejectOccurrenceSchema,
  setPrioritySchema,
  startServiceSchema,
  resolveOccurrenceSchema,
  createObservationSchema,
  adjustLocationSchema,
  correctClassificationSchema,
} from "./occurrence-moderation.schema.js";
import { z } from "zod";

const idParams = z.object({ id: z.string().uuid() });

export interface OccurrenceModerationRoutesDeps {
  authenticate: RequestHandler;
  authorizeRole: (roles: string[]) => RequestHandler;
  adminClient: SupabaseClient;
}

/**
 * A leitura administrativa pode usar o cliente restrito ao backend; toda
 * mutação passa pela sessão do usuário e pelo auth.uid() verificado na RPC.
 * Nenhum Proxy/cast entre repositórios e casos de uso é necessário.
 */
export function createOccurrenceModerationRoutes({
  authenticate, authorizeRole, adminClient,
}: OccurrenceModerationRoutesDeps): Router {
  const router = Router();
  router.use(authenticate, authorizeRole(["ADMIN"]));

  const run = (
    method: keyof Pick<
      OccurrenceModerationController,
      "startAnalysis" | "confirm" | "reject" | "setPriority" |
      "startService" | "resolve" | "createObservation" |
      "adjustLocation" | "correctClassification"
    >,
  ): RequestHandler => async (req, res, next) => {
    try {
      if (!req.token || !req.user) throw new UnauthorizedError();
      const repository = new SupabaseOccurrenceModerationRepository(
        adminClient,
        createUserSupabaseClient(req.token),
      );
      const controller = new OccurrenceModerationController(
        new StartAnalysisUseCase(repository),
        new ConfirmOccurrenceUseCase(repository),
        new RejectOccurrenceUseCase(repository),
        new SetPriorityUseCase(repository),
        new StartServiceUseCase(repository),
        new ResolveOccurrenceUseCase(repository),
        new CreateObservationUseCase(repository),
        new AdjustLocationUseCase(repository),
        new CorrectClassificationUseCase(repository),
      );
      await controller[method](req, res);
    } catch (error) {
      next(error);
    }
  };

  router.patch("/:id/start-analysis",
    validateRequest({ params: idParams }), run("startAnalysis"));
  router.post("/:id/confirm",
    validateRequest({ params: idParams }), run("confirm"));
  router.post("/:id/reject",
    validateRequest({ params: rejectOccurrenceSchema.shape.params,
      body: rejectOccurrenceSchema.shape.body }), run("reject"));
  router.patch("/:id/priority",
    validateRequest({ params: setPrioritySchema.shape.params,
      body: setPrioritySchema.shape.body }), run("setPriority"));
  router.post("/:id/start-service",
    validateRequest({ params: startServiceSchema.shape.params,
      body: startServiceSchema.shape.body }), run("startService"));
  router.post("/:id/resolve",
    validateRequest({ params: resolveOccurrenceSchema.shape.params,
      body: resolveOccurrenceSchema.shape.body }), run("resolve"));
  router.post("/:id/observations",
    validateRequest({ params: createObservationSchema.shape.params,
      body: createObservationSchema.shape.body }), run("createObservation"));
  router.patch("/:id/location",
    validateRequest({ params: adjustLocationSchema.shape.params,
      body: adjustLocationSchema.shape.body }), run("adjustLocation"));
  router.patch("/:id/classification",
    validateRequest({ params: correctClassificationSchema.shape.params,
      body: correctClassificationSchema.shape.body }), run("correctClassification"));
  return router;
}
