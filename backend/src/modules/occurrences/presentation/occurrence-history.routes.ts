import { Router, type RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { OccurrenceHistoryController } from "./occurrence-history.controller.js";
import { GetOccurrenceHistoryUseCase } from "../application/use-cases/get-occurrence-history.use-case.js";
import { SupabaseOccurrenceModerationRepository } from "../../moderation/infrastructure/repositories/supabase-moderation.repository.js";
const getHistorySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export interface OccurrenceHistoryRoutesDeps {
  authenticate: RequestHandler;
  adminClient: SupabaseClient;
  validateRequest: (schema: unknown) => RequestHandler;
}

export function createOccurrenceHistoryRoutes({
  authenticate,
  adminClient,
  validateRequest,
}: OccurrenceHistoryRoutesDeps): Router {
  const repository = new SupabaseOccurrenceModerationRepository(adminClient);
  const controller = new OccurrenceHistoryController(
    new GetOccurrenceHistoryUseCase(repository)
  );

  const router = Router();
  router.use(authenticate);
  // ⚠️ Sem authorizeRole — o use case decide (autor OU admin).

  router.get(
    '/:id/history',
    validateRequest(getHistorySchema),
    (req, res) => controller.handle(req, res)
  );

  return router;
}