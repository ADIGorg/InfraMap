import { randomUUID } from "node:crypto";

import {
  MAX_PHOTO_SIZE_BYTES,
  OCCURRENCE_PHOTO_EXTENSION_BY_MIME,
  OCCURRENCE_PHOTOS_MAX,
  OCCURRENCE_PHOTOS_MIN,
  type OccurrencePhotoMime,
} from "../../../../config/constants.js";

import {
  AppError,
  BadRequestError,
  UnauthorizedError,
} from "../../../../shared/errors/app-error.js";

export type AiPhotoMime = OccurrencePhotoMime;

export interface AiPhotoUpload {
  buffer: Buffer;
  mimetype: string;
}

export interface AiAnalysisRepository {
  uploadPhoto(
    path: string,
    buffer: Buffer,
    mime: AiPhotoMime,
  ): Promise<void>;

  createAnalysis(
    userId: string,
    analysisId: string,
    photoPaths: string[],
  ): Promise<void>;

  removePhotos(paths: string[]): Promise<void>;
}

export interface CreatedAiAnalysis {
  id: string;
  status: "PENDING";
  photoCount: number;
}

// ============================================================
// Magic bytes — valida que o conteúdo bate com o MIME
// ============================================================
function detectMime(buffer: Buffer): AiPhotoMime {
  const isJpeg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;

  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const isPng =
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(pngSignature);

  if (isJpeg) return "image/jpeg";
  if (isPng) return "image/png";

  throw new BadRequestError(
    "O arquivo deve ser uma imagem JPEG ou PNG válida.",
  );
}

export class CreateAiAnalysisUseCase {
  constructor(private readonly repository: AiAnalysisRepository) {}

  async execute(
    userId: string,
    photos: AiPhotoUpload[],
  ): Promise<CreatedAiAnalysis> {
    if (!userId) {
      throw new UnauthorizedError();
    }

    if (
      !Array.isArray(photos) ||
      photos.length < OCCURRENCE_PHOTOS_MIN ||
      photos.length > OCCURRENCE_PHOTOS_MAX
    ) {
      throw new BadRequestError(
        `Envie de ${OCCURRENCE_PHOTOS_MIN} a ${OCCURRENCE_PHOTOS_MAX} fotografias.`,
      );
    }

    // Valida tudo antes de qualquer upload
    const validated = photos.map((photo) => {
      if (!Buffer.isBuffer(photo.buffer)) {
        throw new BadRequestError("Conteúdo da fotografia inválido.");
      }

      if (photo.buffer.length > MAX_PHOTO_SIZE_BYTES) {
        throw new AppError(
          413,
          "PAYLOAD_TOO_LARGE",
          `Cada fotografia deve ter no máximo ${MAX_PHOTO_SIZE_BYTES / 1024 / 1024} MB.`,
        );
      }

      const mime = detectMime(photo.buffer);

      if (photo.mimetype !== mime) {
        throw new BadRequestError(
          "O formato declarado não corresponde à imagem.",
        );
      }

      return { buffer: photo.buffer, mime };
    });

    const analysisId = randomUUID();

    const files = validated.map((photo, index) => {
      const extension = OCCURRENCE_PHOTO_EXTENSION_BY_MIME[photo.mime];
      return {
        ...photo,
        path: `temporary/${userId}/${analysisId}/photo-${index + 1}.${extension}`,
      };
    });

    const paths = files.map((file) => file.path);

    try {
      for (const file of files) {
        await this.repository.uploadPhoto(file.path, file.buffer, file.mime);
      }
      await this.repository.createAnalysis(userId, analysisId, paths);
    } catch (error) {
      try {
        await this.repository.removePhotos(paths);
      } catch {
        /* falha de cleanup não substitui o erro original */
      }
      throw error;
    }

    return {
      id: analysisId,
      status: "PENDING",
      photoCount: paths.length,
    };
  }
}