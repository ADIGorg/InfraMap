import { Router, type RequestHandler } from "express";

import { validateRequest } from "../../../shared/middlewares/validate-request.js";

import { OccurrenceModerationController } from "./occurrence-moderation.controller.js";

import {
  adjustLocationSchema,
  confirmSchema,
  correctClassificationSchema,
  createObservationSchema,
  rejectOccurrenceSchema,
  resolveOccurrenceSchema,
  setPrioritySchema,
  startAnalysisSchema,
  startServiceSchema,
} from "./occurrence-moderation.schema.js";

export interface OccurrenceModerationRoutesDeps {
  authenticate: RequestHandler;
  authorizeRole: (roles: string[]) => RequestHandler;
  createUserClient: (accessToken: string) => import("@supabase/supabase-js").SupabaseClient;
}

export function createOccurrenceModerationRoutes({
  authenticate,
  authorizeRole,
  createUserClient,
}: OccurrenceModerationRoutesDeps): Router {
  const controller = new OccurrenceModerationController(createUserClient);

  const router = Router();
  router.use(authenticate);
  router.use(authorizeRole(["ADMIN"]));

  // MOD-01
  router.patch(
    "/:id/start-analysis",
    validateRequest({ params: startAnalysisSchema.shape.params }),
    (req, res, next) => controller.startAnalysis(req, res).catch(next),
  );
  router.post(
    "/:id/confirm",
    validateRequest({ params: confirmSchema.shape.params }),
    (req, res, next) => controller.confirm(req, res).catch(next),
  );
  router.post(
    "/:id/reject",
    validateRequest({
      params: rejectOccurrenceSchema.shape.params,
      body: rejectOccurrenceSchema.shape.body,
    }),
    (req, res, next) => controller.reject(req, res).catch(next),
  );

  // MOD-02
  router.patch(
    "/:id/priority",
    validateRequest({
      params: setPrioritySchema.shape.params,
      body: setPrioritySchema.shape.body,
    }),
    (req, res, next) => controller.setPriority(req, res).catch(next),
  );
  router.post(
    "/:id/start-service",
    validateRequest({
      params: startServiceSchema.shape.params,
      body: startServiceSchema.shape.body,
    }),
    (req, res, next) => controller.startService(req, res).catch(next),
  );
  router.post(
    "/:id/resolve",
    validateRequest({
      params: resolveOccurrenceSchema.shape.params,
      body: resolveOccurrenceSchema.shape.body,
    }),
    (req, res, next) => controller.resolve(req, res).catch(next),
  );

  // MOD-03
  router.post(
    "/:id/observations",
    validateRequest({
      params: createObservationSchema.shape.params,
      body: createObservationSchema.shape.body,
    }),
    (req, res, next) => controller.createObservation(req, res).catch(next),
  );

  // MOD-04
  router.patch(
    "/:id/location",
    validateRequest({
      params: adjustLocationSchema.shape.params,
      body: adjustLocationSchema.shape.body,
    }),
    (req, res, next) => controller.adjustLocation(req, res).catch(next),
  );
  router.patch(
    "/:id/classification",
    validateRequest({
      params: correctClassificationSchema.shape.params,
      body: correctClassificationSchema.shape.body,
    }),
    (req, res, next) => controller.correctClassification(req, res).catch(next),
  );

  return router;
}