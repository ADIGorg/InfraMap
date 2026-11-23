import { Router } from "express";
import { authenticate } from "../../shared/middlewares/authenticate.js";
import { authorizeRole } from "../../shared/middlewares/authorize-role.js";
import { validateRequest } from "../../shared/middlewares/validate-request.js";
import { forward, list } from "./forwardings.controller.js";
import { listReplies } from "./forwarding-replies.controller.js";
import { syncReplies } from "./forwarding-replies-sync.controller.js";
import {
  forwardOccurrenceBodySchema,
  forwardOccurrenceParamsSchema,
} from "./forwardings.schema.js";

export function createForwardingsRoutes(): Router {
  const router = Router();
  router.use(authenticate);
  router.use(authorizeRole(["ADMIN"]));

  router.post(
    "/:id/forwardings",
    validateRequest({ params: forwardOccurrenceParamsSchema, body: forwardOccurrenceBodySchema }),
    (req, res, next) => forward(req, res).catch(next),
  );

  router.get(
    "/:id/forwardings",
    validateRequest({ params: forwardOccurrenceParamsSchema }),
    (req, res, next) => list(req, res).catch(next),
  );

  // IMPORTANTE: ação de sincronizar usa POST, jamais GET.
  router.post(
    "/:id/forwardings/sync",
    validateRequest({ params: forwardOccurrenceParamsSchema }),
    (req, res, next) => syncReplies(req, res).catch(next),
  );

  router.get(
    "/:id/forwardings/:forwardingId/messages",
    (req, res, next) => listReplies(req, res).catch(next),
  );

  return router;
}
