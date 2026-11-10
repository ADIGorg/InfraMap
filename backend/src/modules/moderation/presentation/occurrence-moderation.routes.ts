import { Router, type RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

import { OccurrenceModerationController } from "./occurrence-moderation.controller.js";
import { StartAnalysisUseCase } from "../application/use-cases/start-analysis.use-case.js";
import { ConfirmOccurrenceUseCase } from "../application/use-cases/confirm-occurrence.use-case.js";
import { RejectOccurrenceUseCase } from "../application/use-cases/reject-occurrence.use-case.js";
import { SetPriorityUseCase } from "../application/use-cases/set-priority.use-case.js";
import { StartServiceUseCase } from "../application/use-cases/start-service.use-case.js";
import { ResolveOccurrenceUseCase } from "../application/use-cases/resolve-occurrence.use-case.js";
import { CreateObservationUseCase } from "../application/use-cases/create-observation.use-case.js";

// ============================================================
// MOD-04
// ============================================================
import { AdjustLocationUseCase } from "../application/use-cases/adjust-location.use-case.js";
import { CorrectClassificationUseCase } from "../application/use-cases/correct-classification.use-case.js";
import { SupabaseOccurrenceModerationRepository } from "../infrastructure/repositories/supabase-moderation.repository.js";
import { validateRequest } from "../../../shared/middlewares/validate-request.js";

import {
  createObservationSchema,
} from "./occurrence-moderation.schema.js";

// ============================================================
// MOD-04 — schemas
// ============================================================
import {
  adjustLocationSchema,
  correctClassificationSchema,
} from './occurrence-moderation.schema.js';

export interface OccurrenceModerationRoutesDeps {
  authenticate: RequestHandler;
  authorizeRole: (roles: string[]) => RequestHandler;
  adminClient: SupabaseClient;
}

export function createOccurrenceModerationRoutes({
  authenticate,
  authorizeRole,
  adminClient,
}: OccurrenceModerationRoutesDeps): Router {
  const repository = new SupabaseOccurrenceModerationRepository(adminClient);

  const controller = new OccurrenceModerationController(
    new StartAnalysisUseCase(repository),
    new ConfirmOccurrenceUseCase(
      new Proxy(repository, {
        get(target, property, receiver) {
          if (property === 'transitionStatus') {
            return async (...args: Parameters<typeof target.transitionStatus>) => {
              await target.transitionStatus(...args);
            };
          }

          const value = Reflect.get(target, property, receiver);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      }) as unknown as ConstructorParameters<typeof ConfirmOccurrenceUseCase>[0]
    ),
    new RejectOccurrenceUseCase(
      new Proxy(repository, {
        get(target, property, receiver) {
          if (property === 'transitionStatus') {
            return async (...args: Parameters<typeof target.transitionStatus>) => {
              await target.transitionStatus(...args);
            };
          }

          const value = Reflect.get(target, property, receiver);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      }) as unknown as ConstructorParameters<typeof RejectOccurrenceUseCase>[0]
    ),
    new SetPriorityUseCase(
      new Proxy(repository, {
        get(target, property, receiver) {
          if (property === 'setPriority') {
            return async (...args: Parameters<typeof target.setPriority>) => {
              await target.setPriority(...args);
            };
          }

          const value = Reflect.get(target, property, receiver);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      }) as unknown as ConstructorParameters<typeof SetPriorityUseCase>[0]
    ),
    new StartServiceUseCase(
      new Proxy(repository, {
        get(target, property, receiver) {
          if (property === 'startService') {
            return async (...args: Parameters<typeof target.startService>) => {
              await target.startService(...args);
            };
          }

          const value = Reflect.get(target, property, receiver);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      }) as unknown as ConstructorParameters<typeof StartServiceUseCase>[0]
    ),
    new ResolveOccurrenceUseCase(
      new Proxy(repository, {
        get(target, property, receiver) {
          if (property === 'resolve') {
            return async (...args: Parameters<typeof target.resolve>) => {
              await target.resolve(...args);
            };
          }

          const value = Reflect.get(target, property, receiver);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      }) as unknown as ConstructorParameters<typeof ResolveOccurrenceUseCase>[0]
    ),
    new CreateObservationUseCase(repository),

    // ============================================================
    // MOD-04 — antes eram `undefined as unknown as ...`
    // ============================================================
    new AdjustLocationUseCase(
      new Proxy(repository, {
        get(target, property, receiver) {
          if (property === 'adjustLocation') {
            return async (...args: Parameters<typeof target.adjustLocation>) => {
              await target.adjustLocation(...args);
            };
          }

          const value = Reflect.get(target, property, receiver);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      }) as unknown as ConstructorParameters<typeof AdjustLocationUseCase>[0]
    ),
    new CorrectClassificationUseCase(
      new Proxy(repository, {
        get(target, property, receiver) {
          if (property === 'correctClassification') {
            return async (...args: Parameters<typeof target.correctClassification>) => {
              await target.correctClassification(...args);
            };
          }

          const value = Reflect.get(target, property, receiver);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      }) as unknown as ConstructorParameters<typeof CorrectClassificationUseCase>[0]
    )
  );

  const router = Router();
  router.use(authenticate);
  router.use(authorizeRole(['ADMIN']));

  // MOD-01
  router.patch('/:id/start-analysis', (req, res) => controller.startAnalysis(req, res));
  router.post('/:id/confirm', (req, res) => controller.confirm(req, res));
  router.post('/:id/reject', (req, res) => controller.reject(req, res));

  // MOD-02
  router.patch('/:id/priority', (req, res) => controller.setPriority(req, res));
  router.post('/:id/start-service', (req, res) => controller.startService(req, res));
  router.post('/:id/resolve', (req, res) => controller.resolve(req, res));

  // MOD-03
  router.post(
    '/:id/observations',
    validateRequest({
      params: createObservationSchema.shape.params,
      body: createObservationSchema.shape.body,
    }),
    (req, res) => controller.createObservation(req, res)
  );

  // ============================================================
  // MOD-04
  // ============================================================
  router.patch(
    '/:id/location',
    validateRequest({
      params: adjustLocationSchema.shape.params,
      body: adjustLocationSchema.shape.body,
    }),
    (req, res) => controller.adjustLocation(req, res)
  );

  router.patch(
    '/:id/classification',
    validateRequest({
      params: correctClassificationSchema.shape.params,
      body: correctClassificationSchema.shape.body,
    }),
    (req, res) => controller.correctClassification(req, res)
  );

  return router;
}