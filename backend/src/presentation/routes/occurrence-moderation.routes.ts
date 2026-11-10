import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { authorizeRole } from '../../shared/middlewares/authorize-role.js';
import { OccurrenceModerationController } from '../controllers/occurrence-moderation.controller.js';
import { StartAnalysisUseCase } from '../../application/use-cases/start-analysis.use-case.js';
import { ConfirmOccurrenceUseCase } from '../../application/use-cases/confirm-occurrence.use-case.js';
import { RejectOccurrenceUseCase } from '../../application/use-cases/reject-occurrence.use-case.js';
import { SupabaseOccurrenceModerationRepository } from '../../infrastructure/supabase/occurrence-moderation.repository.js';

const occurrenceModerationRoutes = Router();

// Injeção de Dependências
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const repository = new SupabaseOccurrenceModerationRepository(supabase);
const moderationRepository = new Proxy(repository, {
  get(target, property, receiver) {
    if (property === 'transitionStatus') {
      return async (...args: Parameters<typeof target.transitionStatus>): Promise<void> => {
        await target.transitionStatus(...args);
      };
    }

    return Reflect.get(target, property, receiver);
  }
}) as unknown as ConstructorParameters<typeof StartAnalysisUseCase>[0];
const controller = new OccurrenceModerationController(
  new StartAnalysisUseCase(moderationRepository),
  new ConfirmOccurrenceUseCase(
    moderationRepository as unknown as ConstructorParameters<typeof ConfirmOccurrenceUseCase>[0]
  ),
  new RejectOccurrenceUseCase(
    moderationRepository as unknown as ConstructorParameters<typeof RejectOccurrenceUseCase>[0]
  )
);

// Todas as rotas exigem autenticação e perfil ADMIN ativo
occurrenceModerationRoutes.use(authenticate);
occurrenceModerationRoutes.use(authorizeRole(['ADMIN']));

occurrenceModerationRoutes.patch('/:id/start-analysis', (req, res) => controller.startAnalysis(req, res));
occurrenceModerationRoutes.post('/:id/confirm', (req, res) => controller.confirm(req, res));
occurrenceModerationRoutes.post('/:id/reject', (req, res) => controller.reject(req, res));

export { occurrenceModerationRoutes };