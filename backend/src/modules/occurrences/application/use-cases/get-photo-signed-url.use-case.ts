import type { IPhotoAccessRepository } from '../../domain/repositories/photo-access.repository.js';
import type { IPhotoUrlService, SignedPhotoUrl } from '../../domain/services/photo-url.service.js';
import type { OccurrenceStatus } from '../../domain/repositories/occurrence-query.repository.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../../shared/errors/app-error.js';

export type PhotoRequesterRole = 'PUBLIC' | 'OWNER' | 'ADMIN';

export interface PhotoRequester {
  role: PhotoRequesterRole;
  userId?: string; // obrigatório quando role = 'OWNER'
}

const PUBLIC_ELIGIBLE_STATUSES: OccurrenceStatus[] = ['CONFIRMED', 'IN_SERVICE'];

export class GetPhotoSignedUrlUseCase {
  constructor(
    private readonly repository: IPhotoAccessRepository,
    private readonly urlService: IPhotoUrlService
  ) {}

  async execute(
    requester: PhotoRequester,
    occurrenceId: string,
    photoId: string
  ): Promise<SignedPhotoUrl> {
    const photo = await this.repository.getPhotoInfo(photoId);
    if (!photo) {
      throw new NotFoundError('Foto não encontrada.');
    }

    // Sanity check: URL enviada é da ocorrência correta
    if (photo.occurrenceId !== occurrenceId) {
      throw new BadRequestError('Foto não pertence à ocorrência informada.');
    }

    // ── Regras de autorização ─────────────────────────────
    if (requester.role === 'ADMIN') {
      // Admin pode ver qualquer foto (necessária à análise)
      // — sem mais restrições
    } else if (requester.role === 'OWNER') {
      if (!requester.userId || photo.occurrenceAuthorId !== requester.userId) {
        throw new ForbiddenError('Você não tem permissão para acessar esta foto.');
      }
    } else if (requester.role === 'PUBLIC') {
      // Público só vê fotos de ocorrências elegíveis (RN022, RN017)
      if (!PUBLIC_ELIGIBLE_STATUSES.includes(photo.occurrenceStatus)) {
        throw new ForbiddenError(
          'Esta foto não está disponível publicamente. A ocorrência não está confirmada ou em atendimento.'
        );
      }
    } else {
      throw new BadRequestError('Papel de solicitante inválido.');
    }

    return this.urlService.generate(photo.storagePath);
  }
}