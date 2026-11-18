import { http, httpMultipart } from '@/infrastructure/api/http-client';
import type {
  CapturedPhoto,
  CreateAiAnalysisResponse,
} from '@/shared/types/registration';

export async function createAiAnalysis(
  photos: CapturedPhoto[],
): Promise<CreateAiAnalysisResponse> {
  const formData = new FormData();

  photos.forEach((photo, index) => {
    // React Native exige este formato de arquivo no FormData.
    formData.append('photos', {
      uri: photo.uri,
      type: photo.mimeType,
      name: `photo-${index + 1}.${photo.mimeType === 'image/png' ? 'png' : 'jpg'}`,
    } as unknown as Blob);
  });

  return httpMultipart<CreateAiAnalysisResponse>('/ai-analyses', formData);
}

export async function startAiAnalysis(id: string): Promise<void> {
  await http(`/ai-analyses/${id}/analyze`, { method: 'POST' });
}
