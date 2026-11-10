import { Router, type RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import { PublicOccurrenceController } from '../controllers/public-occurrence.controller.js';
import { ListPublicOccurrencesUseCase } from '../../application/use-cases/list-public-occurrences.use-case.js';
import { GetPublicOccurrenceUseCase } from '../../application/use-cases/get-public-occurrence.use-case.js';
import { SupabaseOccurrenceQueryRepository } from '../../infrastructure/supabase/occurrence-query.repository.js';
import {
  listPublicOccurrencesSchema,
  occurrenceIdParamSchema,
} from '../schema/occurrence-query.schema.js';

export interface PublicOccurrenceRoutesDeps {
  adminClient: SupabaseClient;
  validateRequest: (schema: unknown) => RequestHandler;
}

export function createPublicOccurrenceRoutes({
  adminClient,
  validateRequest,
}: PublicOccurrenceRoutesDeps): Router {
  const repository = new SupabaseOccurrenceQueryRepository(adminClient);
  const controller = new PublicOccurrenceController(
    new ListPublicOccurrencesUseCase(repository),
    new GetPublicOccurrenceUseCase(repository)
  );

  const router = Router();
  // SEM authenticate — endpoint público (RN003 / RF04)

  router.get(
    '/',
    validateRequest({ query: listPublicOccurrencesSchema.shape.query }),
    (req, res) => controller.list(req, res)
  );
  router.get(
    '/:id',
    validateRequest({ params: occurrenceIdParamSchema.shape.params }),
    (req, res) => controller.detail(req, res)
  );

  return router;
}