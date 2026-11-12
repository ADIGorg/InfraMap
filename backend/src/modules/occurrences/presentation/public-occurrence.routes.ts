import { Router } from "express";

import { validateRequest } from "../../../shared/middlewares/validate-request.js";

import { PublicOccurrenceController } from "./public-occurrence.controller.js";
import { listPublicOccurrencesSchema, occurrenceIdParamSchema } from "./occurrence-query.schema.js";

export function createPublicOccurrenceRoutes(): Router {
  const controller = new PublicOccurrenceController();
  const router = Router();
  // Sem authenticate — endpoint público (RN003)
  router.get("/", validateRequest({ query: listPublicOccurrencesSchema.shape.query }),
    (req, res, next) => controller.list(req, res).catch(next));
  router.get("/:id", validateRequest({ params: occurrenceIdParamSchema.shape.params }),
    (req, res, next) => controller.detail(req, res).catch(next));
  return router;
}