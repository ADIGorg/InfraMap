// src/modules/forwardings/forwardings.routes.ts

import { Router } from "express";

import { authenticate } from "../../shared/middlewares/authenticate.js";
import { authorizeRole } from "../../shared/middlewares/authorize-role.js";
import { validateRequest } from "../../shared/middlewares/validate-request.js";
import { listReplies } from "./forwarding-replies.controller.js";
import { forward, list } from "./forwardings.controller.js";
import {
  forwardOccurrenceBodySchema,
  forwardOccurrenceParamsSchema,
} from "./forwardings.schema.js";

export function createForwardingsRoutes(): Router {
  const router = Router();
  router.use(authenticate);
  router.use(authorizeRole(["ADMIN"]));
  router.get("/:id/forwardings/:forwardingId/messages", (req, res, next) => listReplies(req, res).catch(next));
  
  router.post(
    "/:id/forwardings",
    validateRequest({
      params: forwardOccurrenceParamsSchema,
      body: forwardOccurrenceBodySchema,
    }),
    (req, res, next) => forward(req, res).catch(next),
  );

  router.get(
    "/:id/forwardings",
    validateRequest({ params: forwardOccurrenceParamsSchema }),
    (req, res, next) => list(req, res).catch(next),
  );

  return router;
}