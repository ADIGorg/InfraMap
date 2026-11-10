import { Router, type RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import { MyOccurrenceController } from '../controllers/my-occurrence.controller.js';
import { ListMyOccurrencesUseCase } from '../../application/use-cases/list-my-occurrences.use-case.js';
import { GetMyOccurrenceUseCase } from '../../application/use-cases/get-my-occurrence.use-case.js';
import { SupabaseOccurrenceQueryRepository } from '../../infrastructure/supabase/occurrence-query.repository.js';
import {
  listMyOccurrencesSchema,
  occurrenceIdParamSchema,
} from '../schema/occurrence-query.schema.js'

export interface MyOccurrenceRoutesDeps {
  authenticate: RequestHandler;
  adminClient: SupabaseClient;
  validateRequest: (schema: unknown) => RequestHandler;
}

export function createMyOccurrenceRoutes({
  authenticate,
  adminClient,
  validateRequest,
}: MyOccurrenceRoutesDeps): Router {
  const repository = new SupabaseOccurrenceQueryRepository(adminClient);
  const controller = new MyOccurrenceController(
    new ListMyOccurrencesUseCase(repository),
    new GetMyOccurrenceUseCase(repository)
  );

  const router = Router();
  router.use(authenticate);

  router.get(
    '/',
    validateRequest({ query: listMyOccurrencesSchema.shape.query }),
    (req, res) => controller.list(req, res)
  );
  router.get(
    '/:id',
    validateRequest({ params: occurrenceIdParamSchema.shape.params }),
    (req, res) => controller.detail(req, res)
  );

  return router;
}