import type { OccurrenceStatus } from './occurrence-query.repository.js';

export interface PhotoAccessInfo {
  photoId: string;
  occurrenceId: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  position: number;
  occurrenceStatus: OccurrenceStatus;
  occurrenceAuthorId: string;
}

export interface IPhotoAccessRepository {
  /**
   * Retorna metadados da foto + status da ocorrência + autor.
   * Usado pelo use case para decidir se o requester pode ver a foto.
   */
  getPhotoInfo(photoId: string): Promise<PhotoAccessInfo | null>;
}