import { Router, type RequestHandler } from "express";

import { authenticate } from "../../../shared/middlewares/authenticate.js";
import { validateRequest } from "../../../shared/middlewares/validate-request.js";

import { FinalizeOccurrenceController } from "./occurrence.controller.js";
import { finalizeOccurrenceSchema } from "./occurrence.schema.js";

export interface OccurrenceRoutesDeps {
  authenticate?: RequestHandler;
}

export function createOccurrenceRoutes({
  authenticate: auth = authenticate,
}: OccurrenceRoutesDeps = {}): Router {
  const controller = new FinalizeOccurrenceController();
  const router = Router();
  router.post(
    "/finalize",
    auth,
    validateRequest({ body: finalizeOccurrenceSchema.shape.body }),
    (req, res, next) => controller.handle(req, res).catch(next),
  );
  return router;
}