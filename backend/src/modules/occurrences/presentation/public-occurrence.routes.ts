import { Router, type RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import { PublicOccurrenceController } from "./public-occurrence.controller.js";
import { ListPublicOccurrencesUseCase } from "../application/use-cases/list-public-occurrences.use-case.js";
import { GetPublicOccurrenceUseCase } from "../application/use-cases/get-public-occurrence.use-case.js";
import { SupabaseOccurrenceQueryRepository } from "../infrastructure/repositories/supabase-occurrence-query.repository.js";
import { SupabasePhotoUrlService } from "../../../infrastructure/storage/supabase-photo-url.service.js";
import {
  listPublicOccurrencesSchema,
  occurrenceIdParamSchema,
} from './occurrence-query.schema.js';

export interface PublicOccurrenceRoutesDeps {
  adminClient: SupabaseClient;
  validateRequest: (schema: unknown) => RequestHandler;
}

export function createPublicOccurrenceRoutes({
  adminClient,
  validateRequest,
}: PublicOccurrenceRoutesDeps): Router {
  // Dependências do módulo (OCC-02 + OCC-03)
  const repository = new SupabaseOccurrenceQueryRepository(adminClient);
  const photoUrlService = new SupabasePhotoUrlService(adminClient);

  const controller = new PublicOccurrenceController(
    new ListPublicOccurrencesUseCase(repository),
    new GetPublicOccurrenceUseCase(repository, photoUrlService)
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