import { NotFoundError } from "../../../../shared/errors/app-error.js";
// src/modules/occurrences/application/use-cases/get-public-occurrence.use-case.ts

import type {
  IOccurrenceQueryRepository,
  PublicOccurrenceDetail,
} from '../../domain/repositories/occurrence-query.repository.js';
import type {
  IPhotoUrlService,
  SignedPhotoUrl,
} from '../../domain/services/photo-url.service.js';

/**
 * Detalhe público enriquecido com URLs assinadas das fotos.
 *
 * Diferença em relação a `PublicOccurrenceDetail`:
 *  - `photos` (com `storagePath`) é omitido do payload final
 *  - `photoUrls` expõe apenas URLs temporárias (com expiração curta)
 */
export interface PublicOccurrenceDetailWithUrls
  extends Omit<PublicOccurrenceDetail, 'photos'> {
  photoUrls: Array<{
    mimeType: string;
    sizeBytes: number;
    position: number;
    url: string;
    expiresAt: string;
    expiresInSeconds: number;
  }>;
}

export class GetPublicOccurrenceUseCase {
  constructor(
    private readonly repository: IOccurrenceQueryRepository,
    private readonly photoUrlService: IPhotoUrlService
  ) {}

  async execute(id: string): Promise<PublicOccurrenceDetailWithUrls> {
    const item = await this.repository.getPublic(id);
    if (!item) throw new NotFoundError('Ocorrência não encontrada ou não é pública.');

    // Regra do OCC-03 (RN022): público só vê fotos de CONFIRMED/IN_SERVICE.
    // A RPC já filtra por status público no WHERE, mas revalidamos aqui
    // por defesa em profundidade.
    const eligibleForPublicPhotos =
      item.status === 'CONFIRMED' || item.status === 'IN_SERVICE';

    const paths: string[] = eligibleForPublicPhotos
      ? item.photos.map((p) => p.storagePath)
      : [];

    const urlsMap: Record<string, SignedPhotoUrl> = paths.length
      ? await this.photoUrlService.generateBatch(paths)
      : {};

    const photoUrls = item.photos
      .filter((p) => Boolean(urlsMap[p.storagePath]))
      .map((p) => {
        const signed = urlsMap[p.storagePath]!;
        return {
          mimeType: p.mimeType,
          sizeBytes: p.sizeBytes,
          position: p.position,
          url: signed.url,
          expiresAt: signed.expiresAt,
          expiresInSeconds: signed.expiresInSeconds,
        };
      });

    // Não vazar `storagePath` no payload final
    const { photos: _photos, ...publicDetail } = item;
    void _photos; // consome a variável para o linter

    return { ...publicDetail, photoUrls };
  }
}