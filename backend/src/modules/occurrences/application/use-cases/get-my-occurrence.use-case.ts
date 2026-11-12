import { NotFoundError } from "../../../../shared/errors/app-error.js";
import type {
  IOccurrenceQueryRepository,
  MyOccurrenceDetail,
} from '../../domain/repositories/occurrence-query.repository.js';
import type { IPhotoUrlService } from '../../domain/services/photo-url.service.js';

export interface MyOccurrenceDetailWithUrls extends MyOccurrenceDetail {
  photoUrls: Array<{
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
    position: number;
    url: string;
    expiresAt: string;
    expiresInSeconds: number;
  }>;
}

export class GetMyOccurrenceUseCase {
  constructor(
    private readonly repository: IOccurrenceQueryRepository,
    private readonly photoUrlService: IPhotoUrlService
  ) {}

  async execute(userId: string, id: string): Promise<MyOccurrenceDetailWithUrls> {
    const item = await this.repository.getMine(userId, id);
    if (!item) throw new NotFoundError('Ocorrência não encontrada.');

    const paths = item.photos.map((p) => p.storagePath);
    const urlsMap = await this.photoUrlService.generateBatch(paths);

    const photoUrls = item.photos
      .filter((p) => urlsMap[p.storagePath])
      .map((p) => ({
        storagePath: p.storagePath,
        mimeType: p.mimeType,
        sizeBytes: p.sizeBytes,
        position: p.position,
        ...urlsMap[p.storagePath]!,
      }));

    return { ...item, photoUrls };
  }
}