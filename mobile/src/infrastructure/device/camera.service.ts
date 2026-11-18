import type { CameraView } from 'expo-camera';
import { AppError } from '@/shared/errors/app-error';
import type { CapturedPhoto, PhotoMimeType } from '@/shared/types/registration';
import { File } from 'expo-file-system';

export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS = 3;

export function validatePhoto(
  mimeType: string,
  sizeBytes: number,
): asserts mimeType is PhotoMimeType {
  if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
    throw new AppError(
      400,
      'PHOTO_MIME_NOT_SUPPORTED',
      'Formato não suportado. Use uma foto JPEG ou PNG.',
    );
  }
  if (sizeBytes > MAX_PHOTO_SIZE_BYTES) {
    throw new AppError(
      413,
      'PHOTO_TOO_LARGE',
      'Cada foto deve ter no máximo 5 MB.',
    );
  }
}

function mimeTypeFromUri(uri: string): PhotoMimeType {
  const normalized = uri.toLowerCase().split('?')[0];
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.heic') || normalized.endsWith('.heif')) {
    throw new AppError(
      400,
      'HEIC_NOT_SUPPORTED',
      'Formato HEIC não suportado. Use JPEG.',
    );
  }
  if (normalized.endsWith('.gif') || normalized.endsWith('.webp')) {
    throw new AppError(
      400,
      'PHOTO_MIME_NOT_SUPPORTED',
      'Formato não suportado. Use uma foto JPEG ou PNG.',
    );
  }
  return 'image/jpeg';
}

function getFileSize(uri: string): number {
  try {
    const file = new File(uri);

    if (!file.exists) {
      throw new AppError(
        400,
        'PHOTO_NOT_FOUND',
        'A foto capturada não está mais disponível.',
      );
    }

    if (file.size <= 0) {
      throw new AppError(
        400,
        'EMPTY_PHOTO',
        'A foto capturada está vazia.',
      );
    }

    return file.size;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      500,
      'PHOTO_METADATA_FAILED',
      'Não foi possível validar a foto capturada.',
    );
  }
}

export async function capturePhoto(
  camera: CameraView | null,
): Promise<CapturedPhoto> {
  if (!camera) {
    throw new AppError(
      503,
      'CAMERA_UNAVAILABLE',
      'Câmera indisponível. Tente novamente.',
    );
  }

  const result = await camera.takePictureAsync({
    quality: 0.7,
    exif: false,
    skipProcessing: false,
  });

  if (!result?.uri) {
    throw new AppError(500, 'CAPTURE_FAILED', 'Falha ao capturar foto.');
  }

  const mimeType = mimeTypeFromUri(result.uri);
  const sizeBytes = getFileSize(result.uri);
  validatePhoto(mimeType, sizeBytes);

  return {
    uri: result.uri,
    mimeType,
    sizeBytes,
    width: result.width,
    height: result.height,
  };
}
