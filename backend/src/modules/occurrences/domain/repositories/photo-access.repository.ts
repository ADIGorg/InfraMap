import type { OccurrenceStatus } from './occurrence-query.repository.js';

export interface PhotoAccessInfo {
  photoId: string;
  occurrenceId: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  position: number;
  isPublic: boolean;
  occurrenceStatus: OccurrenceStatus;
  occurrenceAuthorId: string;
  occurrencePublicVisible: boolean;
}

export interface IPhotoAccessRepository {
  getPhotoInfo(photoId: string): Promise<PhotoAccessInfo | null>;
}
