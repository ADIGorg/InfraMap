import { Router, type RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import { PhotoAccessController } from '../controllers/photo-access.controller.js';
import { GetPhotoSignedUrlUseCase } from '../../application/use-cases/get-photo-signed-url.use-case.js';
import { SupabasePhotoAccessRepository } from '../../infrastructure/supabase/supabase-photo-access.repository.js';
import { SupabasePhotoUrlService } from '../../infrastructure/storage/supabase-photo-url.service.js';
import { photoAccessParamsSchema } from '../schema/photo-access.schema.js';

export interface PhotoAccessRoutesDeps {
  authenticate: RequestHandler;
  authorizeRole: (roles: string[]) => RequestHandler;
  adminClient: SupabaseClient;
  validateRequest: (schema: unknown) => RequestHandler;
}

export interface PhotoAccessRouters {
  publicRouter: Router;
  myRouter: Router;
  adminRouter: Router;
}

/**
 * Cria 3 routers (public, mine, admin) com o mesmo path `/:id/photos/:photoId`,
 * mas com middlewares e roles diferentes. O consumidor (index.routes.ts)
 * registra cada um no prefixo adequado.
 */
export function createPhotoAccessRoutes({
  authenticate,
  authorizeRole,
  adminClient,
  validateRequest,
}: PhotoAccessRoutesDeps): PhotoAccessRouters {
  const repository = new SupabasePhotoAccessRepository(adminClient);
  const urlService = new SupabasePhotoUrlService(adminClient);
  const useCase = new GetPhotoSignedUrlUseCase(repository, urlService);

  const publicController = new PhotoAccessController(useCase, 'PUBLIC');
  const myController = new PhotoAccessController(useCase, 'OWNER');
  const adminController = new PhotoAccessController(useCase, 'ADMIN');

  // ── Público ──────────────────────────────────────
  const publicRouter = Router();
  publicRouter.get(
    '/:id/photos/:photoId',
    validateRequest({ params: photoAccessParamsSchema.shape.params }),
    (req, res) => publicController.handle(req, res)
  );

  // ── Cidadão autor ────────────────────────────────
  const myRouter = Router();
  myRouter.use(authenticate);
  myRouter.get(
    '/:id/photos/:photoId',
    validateRequest({ params: photoAccessParamsSchema.shape.params }),
    (req, res) => myController.handle(req, res)
  );

  // ── Administrador ────────────────────────────────
  const adminRouter = Router();
  adminRouter.use(authenticate);
  adminRouter.use(authorizeRole(['ADMIN']));
  adminRouter.get(
    '/:id/photos/:photoId',
    validateRequest({ params: photoAccessParamsSchema.shape.params }),
    (req, res) => adminController.handle(req, res)
  );

  return { publicRouter, myRouter, adminRouter };
}