import { http } from '@/infrastructure/api/http-client';
import type { DataSource, PhotoMimeType } from '@/shared/types/registration';

export interface FinalizePhotoInput {
  storagePath: string;
  mimeType: PhotoMimeType;
  sizeBytes: number;
}

export interface FinalizeOccurrenceInput {
  aiAnalysisId: string;
  categoryId: string;
  description: string;
  location: { lat: number; lng: number };
  categorySource: DataSource;
  descriptionSource: DataSource;
  photos: FinalizePhotoInput[];
  /** Seleção explícita do cidadão antes da captura (RN017). */
  photoPublicConsent: boolean;
}

export interface FinalizeOccurrenceResult {
  id: string;
  status: 'RECEIVED';
  summary: {
    categoryId: string;
    descriptionLength: number;
    photosCount: number;
  };
}

export function buildTemporaryPhotoPath(
  userId: string,
  analysisId: string,
  index: number,
  mimeType: PhotoMimeType,
): string {
  const extension = mimeType === 'image/png' ? 'png' : 'jpg';
  return `temporary/${userId}/${analysisId}/photo-${index + 1}.${extension}`;
}

export async function finalizeOccurrence(
  input: FinalizeOccurrenceInput,
): Promise<FinalizeOccurrenceResult> {
  return http<FinalizeOccurrenceResult>('/occurrences/finalize', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function occurrenceIdFromErrorMessage(message: string): string | null {
  return message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)?.[0] ?? null;
}
