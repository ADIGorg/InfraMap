import { File } from 'expo-file-system';

import {
  http,
  httpMultipart,
} from '@/infrastructure/api/http-client';

import { AppError } from '@/shared/errors/app-error';

import type {
  CapturedPhoto,
  CreateAiAnalysisResponse,
} from '@/shared/types/registration';

export async function createAiAnalysis(
  photos: CapturedPhoto[],
): Promise<CreateAiAnalysisResponse> {
  if (photos.length < 1 || photos.length > 3) {
    throw new AppError(
      400,
      'INVALID_PHOTO_COUNT',
      'Adicione de 1 a 3 fotos.',
    );
  }

  const formData = new FormData();

  photos.forEach((photo, index) => {
    const extension =
      photo.mimeType === 'image/png' ? 'png' : 'jpg';

    const fileName = `photo-${index + 1}.${extension}`;

    const file = new File(photo.uri);

    if (!file.exists) {
      throw new AppError(
        400,
        'PHOTO_NOT_FOUND',
        `A foto ${index + 1} não está mais disponível. Tire a foto novamente.`,
      );
    }

    if (file.size <= 0) {
      throw new AppError(
        400,
        'EMPTY_PHOTO',
        `A foto ${index + 1} está vazia. Tire a foto novamente.`,
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new AppError(
        413,
        'PHOTO_TOO_LARGE',
        `A foto ${index + 1} deve ter no máximo 5 MB.`,
      );
    }

    console.log(
      '[UploadService] Adicionando foto:',
      {
        index,
        uri: file.uri,
        mimeType: file.type,
        sizeBytes: file.size,
        fileName,
      },
    );

    formData.append(
      'photos',
      file,
      fileName,
    );
  });

  return httpMultipart<CreateAiAnalysisResponse>(
    '/ai-analyses',
    formData,
  );
}

export async function startAiAnalysis(
  id: string,
): Promise<void> {
  await http(
    `/ai-analyses/${id}/analyze`,
    {
      method: 'POST',
    },
  );
}