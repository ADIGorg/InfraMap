import { Router } from "express";

import { authenticate } from "../../../shared/middlewares/authenticate.js";
import { validateRequest } from "../../../shared/middlewares/validate-request.js";

import { OccurrenceHistoryController } from "./occurrence-history.controller.js";
import { getHistorySchema } from "./occurrence-history.schema.js";

export function createOccurrenceHistoryRoutes(): Router {
  const controller = new OccurrenceHistoryController();
  const router = Router();
  router.use(authenticate);

  // Sem authorizeRole — o use case decide (autor OU admin)
  router.get(
    "/:id/history",
    validateRequest({ params: getHistorySchema.shape.params }),  // ← fix
    (req, res, next) => controller.handle(req, res).catch(next),
  );

  return router;
}