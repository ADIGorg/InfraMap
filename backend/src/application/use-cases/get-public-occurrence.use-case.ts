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
    if (!item) throw new Error('Ocorrência não encontrada ou não é pública.');

    // Regra do OCC-03 (RN022): público só vê fotos de CONFIRMED/IN_SERVICE.
    // A RPC já filtra por status público no WHERE, mas revalidamos aqui
    // por defesa em profundidade.
    const eligibleForPublicPhotos =
      item.status === 'CONFIRMED' || item.status === 'IN_SERVICE';

    const paths = eligibleForPublicPhotos
      ? item.photos.map((p: { storagePath: any; }) => p.storagePath)
      : [];

    const urlsMap: Record<string, SignedPhotoUrl> = paths.length
      ? await this.photoUrlService.generateBatch(paths)
      : {};

    const photoUrls = item.photos
      .filter((p: { storagePath: string | number; }) => urlsMap[p.storagePath])
      .map((p: { storagePath: string | number; mimeType: any; sizeBytes: any; position: any; }) => {
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

    return { ...publicDetail, photoUrls };
  }
}