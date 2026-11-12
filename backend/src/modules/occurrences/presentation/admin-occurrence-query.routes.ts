import { Router } from "express";

import { authenticate } from "../../../shared/middlewares/authenticate.js";
import { authorizeRole } from "../../../shared/middlewares/authorize-role.js";
import { validateRequest } from "../../../shared/middlewares/validate-request.js";

import { AdminOccurrenceQueryController } from "./admin-occurrence-query.controller.js";
import { listAdminOccurrencesSchema, occurrenceIdParamSchema } from "./occurrence-query.schema.js";

export function createAdminOccurrenceQueryRoutes(): Router {
  const controller = new AdminOccurrenceQueryController();
  const router = Router();
  router.use(authenticate);
  router.use(authorizeRole(["ADMIN"]));
  router.get("/", validateRequest({ query: listAdminOccurrencesSchema.shape.query }),
    (req, res, next) => controller.list(req, res).catch(next));
  router.get("/:id", validateRequest({ params: occurrenceIdParamSchema.shape.params }),
    (req, res, next) => controller.detail(req, res).catch(next));
  return router;
}