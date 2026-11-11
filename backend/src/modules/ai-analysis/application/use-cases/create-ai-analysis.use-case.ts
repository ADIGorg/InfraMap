import type { AiPhotoMime, AiAnalysisRepository } from "../ports/ai-analysis.repository.js";
export type { AiPhotoMime, AiAnalysisRepository } from "../ports/ai-analysis.repository.js";

import { randomUUID } from "node:crypto";


import {
  AppError,
  BadRequestError,
  UnauthorizedError,
} from "../../../../shared/errors/app-error.js";


export const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

export interface AiPhotoUpload {
  buffer: Buffer;
  mimetype: string;
}

export interface CreatedAiAnalysis {
  id: string;
  status: "PENDING";
  photoCount: number;
}

// Verifica os bytes reais do arquivo.
function detectMime(buffer: Buffer): AiPhotoMime {
  const isJpeg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;

  const pngSignature = Buffer.from([
    137, 80, 78, 71, 13, 10, 26, 10,
  ]);

  const isPng =
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(pngSignature);

  if (isJpeg) return "image/jpeg";
  if (isPng) return "image/png";

  throw new BadRequestError(
    "O arquivo deve ser uma imagem JPEG ou PNG válida."
  );
}

export class CreateAiAnalysisUseCase {
  constructor(
    private readonly repository: AiAnalysisRepository
  ) {}

  async execute(
    userId: string,
    photos: AiPhotoUpload[]
  ): Promise<CreatedAiAnalysis> {
    if (!userId) {
      throw new UnauthorizedError();
    }

    if (
      !Array.isArray(photos) ||
      photos.length < 1 ||
      photos.length > 3
    ) {
      throw new BadRequestError(
        "Envie de 1 a 3 fotografias."
      );
    }

    // Valida todas as fotos antes de fazer uploads.
    const validated = photos.map((photo) => {
      if (!Buffer.isBuffer(photo.buffer)) {
        throw new BadRequestError(
          "Conteúdo da fotografia inválido."
        );
      }

      if (photo.buffer.length > MAX_PHOTO_SIZE) {
        throw new AppError(
          413,
          "PAYLOAD_TOO_LARGE",
          "Cada fotografia deve ter no máximo 5 MB."
        );
      }

      const mime = detectMime(photo.buffer);

      // Também verifica se o MIME declarado
      // corresponde aos bytes do arquivo.
      if (photo.mimetype !== mime) {
        throw new BadRequestError(
          "O formato declarado não corresponde à imagem."
        );
      }

      return {
        buffer: photo.buffer,
        mime,
      };
    });

    const analysisId = randomUUID();

    const files = validated.map((photo, index) => {
      const extension =
        photo.mime === "image/jpeg" ? "jpg" : "png";

      return {
        ...photo,
        path:
          `temporary/${userId}/${analysisId}/` +
          `photo-${index + 1}.${extension}`,
      };
    });

    const paths = files.map((file) => file.path);

    try {
      // Envia as fotos ao bucket privado.
      for (const file of files) {
        await this.repository.uploadPhoto(
          file.path,
          file.buffer,
          file.mime
        );
      }

      // Cria a análise somente após os uploads.
      await this.repository.createAnalysis(
        userId,
        analysisId,
        paths
      );
    } catch (error) {
      // Tenta limpar os arquivos temporários
      // se o upload ou o cadastro falhar.
      try {
        await this.repository.removePhotos(paths);
      } catch {
        // Uma falha na limpeza não substitui
        // o erro original.
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
