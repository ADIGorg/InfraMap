import { Router } from "express";

import { authenticate } from "../../../shared/middlewares/authenticate.js";
import { validateRequest } from "../../../shared/middlewares/validate-request.js";

import { MyOccurrenceController } from "./my-occurrence.controller.js";
import { listMyOccurrencesSchema, occurrenceIdParamSchema } from "./occurrence-query.schema.js";

export function createMyOccurrenceRoutes(): Router {
  const controller = new MyOccurrenceController();
  const router = Router();
  router.use(authenticate);
  router.get("/", validateRequest({ query: listMyOccurrencesSchema.shape.query }),
    (req, res, next) => controller.list(req, res).catch(next));
  router.get("/:id", validateRequest({ params: occurrenceIdParamSchema.shape.params }),
    (req, res, next) => controller.detail(req, res).catch(next));
  return router;
}