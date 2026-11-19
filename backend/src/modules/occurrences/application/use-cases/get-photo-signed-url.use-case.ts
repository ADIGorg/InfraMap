import type { IPhotoAccessRepository } from '../../domain/repositories/photo-access.repository.js';
import type { IPhotoUrlService, SignedPhotoUrl } from '../../domain/services/photo-url.service.js';
import type { OccurrenceStatus } from '../../domain/repositories/occurrence-query.repository.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../../shared/errors/app-error.js';

export type PhotoRequesterRole = 'PUBLIC' | 'OWNER' | 'ADMIN';
export interface PhotoRequester { role: PhotoRequesterRole; userId?: string; }
const PUBLIC_ELIGIBLE_STATUSES: OccurrenceStatus[] = ['CONFIRMED', 'IN_SERVICE'];

export class GetPhotoSignedUrlUseCase {
  constructor(private readonly repository: IPhotoAccessRepository, private readonly urlService: IPhotoUrlService) {}
  async execute(requester: PhotoRequester, occurrenceId: string, photoId: string): Promise<SignedPhotoUrl> {
    const photo = await this.repository.getPhotoInfo(photoId);
    if (!photo) throw new NotFoundError('Foto nao encontrada.');
    if (photo.occurrenceId !== occurrenceId) throw new BadRequestError('Foto nao pertence a ocorrencia informada.');
    if (requester.role === 'ADMIN') {
      // Admin pode analisar qualquer foto.
    } else if (requester.role === 'OWNER') {
      if (!requester.userId || photo.occurrenceAuthorId !== requester.userId) throw new ForbiddenError('Voce nao tem permissao para acessar esta foto.');
    } else if (requester.role === 'PUBLIC') {
<<<<<<< HEAD
      if (!photo.isPublic || !PUBLIC_ELIGIBLE_STATUSES.includes(photo.occurrenceStatus) || !photo.occurrencePublicVisible) {
        throw new ForbiddenError('Esta foto nao esta disponivel publicamente.');
=======
      // Público só vê fotos de ocorrências elegíveis (RN022, RN017)
      if (!PUBLIC_ELIGIBLE_STATUSES.includes(photo.occurrenceStatus)
          || !photo.occurrencePublicVisible
          || photo.occurrencePhotoPublicConsent !== true) {
        throw new ForbiddenError(
          'Esta foto não está disponível publicamente.'
        );
>>>>>>> feature/web-ui-07-gestao-adm
      }
    } else {
      throw new BadRequestError('Papel de solicitante invalido.');
    }
    return this.urlService.generate(photo.storagePath);
  }
}
