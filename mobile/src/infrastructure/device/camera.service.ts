import type { CameraView } from 'expo-camera';
import { AppError } from '@/shared/errors/app-error';
import type { CapturedPhoto, PhotoMimeType } from '@/shared/types/registration';

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

async function getFileSize(uri: string): Promise<number> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.size;
  } catch {
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
  const sizeBytes = await getFileSize(result.uri);
  validatePhoto(mimeType, sizeBytes);

  return {
    uri: result.uri,
    mimeType,
    sizeBytes,
    width: result.width,
    height: result.height,
  };
}
