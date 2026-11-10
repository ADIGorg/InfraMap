import { Router, type RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import { FinalizeOccurrenceController } from '../controllers/occurrence.controller.js';
import { FinalizeOccurrenceUseCase } from '../../application/use-cases/finalize-occurrence.use-case.js';
import { SupabaseOccurrenceRepository } from '../../infrastructure/occurrence.repository.js';
import { validateRequest } from '../../shared/middlewares/validate-request.js';
import { finalizeOccurrenceSchema } from '../schema/occurrence.schema.js';

export interface OccurrenceRoutesDeps {
  authenticate: RequestHandler;
  adminClient: SupabaseClient;
}

export function createOccurrenceRoutes({
  authenticate,
  adminClient,
}: OccurrenceRoutesDeps): Router {
  const repository = new SupabaseOccurrenceRepository(adminClient);
  const controller = new FinalizeOccurrenceController(
    new FinalizeOccurrenceUseCase(repository)
  );

  const router = Router();

  // POST /occurrences/finalize — cidadão registra a ocorrência
  router.post(
    '/finalize',
    authenticate,
    validateRequest({ body: finalizeOccurrenceSchema.shape.body }),
    (req, res) => controller.handle(req, res)
  );

  return router;
}