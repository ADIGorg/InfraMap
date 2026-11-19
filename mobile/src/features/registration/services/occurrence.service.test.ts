import { buildTemporaryPhotoPath, occurrenceIdFromErrorMessage, finalizeOccurrence } from './occurrence.service';
import { http } from '@/infrastructure/api/http-client';

jest.mock('@/infrastructure/api/http-client', () => ({ http: jest.fn() }));

describe('consentimento no contrato de finalização (RN017)', () => {
  const base = {
    aiAnalysisId: '00000000-0000-4000-8000-000000000001',
    categoryId: '00000000-0000-4000-8000-000000000002',
    description: 'Problema registrado',
    location: { lat: -12.3, lng: -38.9 },
    categorySource: 'USER_MANUAL' as const,
    descriptionSource: 'USER_MANUAL' as const,
    photos: [{ storagePath: 'temporary/u/a/photo-1.jpg', mimeType: 'image/jpeg' as const, sizeBytes: 500 }],
  };
  beforeEach(() => jest.clearAllMocks());

  it.each([true, false])('envia ao backend a seleção pública = %s', async (consent) => {
    jest.mocked(http).mockResolvedValueOnce({
      id: '00000000-0000-4000-8000-000000000003', status: 'RECEIVED',
      summary: { categoryId: base.categoryId, descriptionLength: 18, photosCount: 1 },
    });
    await finalizeOccurrence({ ...base, photoPublicConsent: consent });
    expect(http).toHaveBeenCalledWith('/occurrences/finalize', {
      method: 'POST',
      body: JSON.stringify({ ...base, photoPublicConsent: consent }),
    });
  });
});
