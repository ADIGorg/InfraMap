import { Router, type RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authorizeRole } from '../../../shared/middlewares/authorize-role.js';


import { MyOccurrenceController } from "./my-occurrence.controller.js";
import { ListMyOccurrencesUseCase } from "../application/use-cases/list-my-occurrences.use-case.js";
import { GetMyOccurrenceUseCase } from "../application/use-cases/get-my-occurrence.use-case.js";
import { SupabaseOccurrenceQueryRepository } from "../infrastructure/repositories/supabase-occurrence-query.repository.js";
import { SupabasePhotoUrlService } from "../../../infrastructure/storage/supabase-photo-url.service.js";
import {
  listMyOccurrencesSchema,
  occurrenceIdParamSchema,
} from './occurrence-query.schema.js';

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
  // Dependências do módulo (OCC-02 + OCC-03)
  const repository = new SupabaseOccurrenceQueryRepository(adminClient);
  const photoUrlService = new SupabasePhotoUrlService(adminClient);

  const controller = new MyOccurrenceController(
    new ListMyOccurrencesUseCase(repository),
    new GetMyOccurrenceUseCase(repository, photoUrlService)
  );

  const router = Router();
  router.use(authenticate, authorizeRole(['CITIZEN']));

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