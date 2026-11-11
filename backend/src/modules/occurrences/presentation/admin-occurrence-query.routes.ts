import { Router, type RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import { AdminOccurrenceQueryController } from "./admin-occurrence-query.controller.js";
import { ListAdminOccurrencesUseCase } from "../application/use-cases/list-admin-occurrences.use-case.js";
import { GetAdminOccurrenceUseCase } from "../application/use-cases/get-admin-occurrence.use-case.js";
import { SupabaseOccurrenceQueryRepository } from "../infrastructure/repositories/supabase-occurrence-query.repository.js";
import { SupabasePhotoUrlService } from "../../../infrastructure/storage/supabase-photo-url.service.js";
import {
  listAdminOccurrencesSchema,
  occurrenceIdParamSchema,
} from './occurrence-query.schema.js';

export interface AdminOccurrenceQueryRoutesDeps {
  authenticate: RequestHandler;
  authorizeRole: (roles: string[]) => RequestHandler;
  adminClient: SupabaseClient;
  validateRequest: (schema: unknown) => RequestHandler;
}

export function createAdminOccurrenceQueryRoutes({
  authenticate,
  authorizeRole,
  adminClient,
  validateRequest,
}: AdminOccurrenceQueryRoutesDeps): Router {
  // Dependências do módulo (OCC-02 + OCC-03)
  const repository = new SupabaseOccurrenceQueryRepository(adminClient);
  const photoUrlService = new SupabasePhotoUrlService(adminClient);

  const controller = new AdminOccurrenceQueryController(
    new ListAdminOccurrencesUseCase(repository),
    new GetAdminOccurrenceUseCase(repository, photoUrlService)
  );

  const router = Router();
  router.use(authenticate);
  router.use(authorizeRole(['ADMIN']));

  router.get(
    '/',
    validateRequest({ query: listAdminOccurrencesSchema.shape.query }),
    (req, res) => controller.list(req, res)
  );

  router.get(
    '/:id',
    validateRequest({ params: occurrenceIdParamSchema.shape.params }),
    (req, res) => controller.detail(req, res)
  );

  return router;
}