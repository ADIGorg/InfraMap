import { NotFoundError } from "../../../../shared/errors/app-error.js";
import type {
  AdminOccurrenceDetail,
  IOccurrenceQueryRepository,
} from '../../domain/repositories/occurrence-query.repository.js';
import type { IPhotoUrlService } from '../../domain/services/photo-url.service.js';

export interface AdminOccurrenceDetailWithUrls extends AdminOccurrenceDetail {
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

export class GetAdminOccurrenceUseCase {
  constructor(
    private readonly repository: IOccurrenceQueryRepository,
    private readonly photoUrlService: IPhotoUrlService
  ) {}

  async execute(id: string): Promise<AdminOccurrenceDetailWithUrls> {
    const item = await this.repository.getAdmin(id);
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