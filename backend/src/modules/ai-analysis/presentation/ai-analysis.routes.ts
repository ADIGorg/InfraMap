import { Router, type RequestHandler } from "express";
import multer from "multer";

import {
  MAX_PHOTO_SIZE_BYTES,
  OCCURRENCE_PHOTOS_MAX,
} from "../../../config/constants.js";

import {
  AppError,
  BadRequestError,
  UnauthorizedError,
} from "../../../shared/errors/app-error.js";

import { authenticate } from "../../../shared/middlewares/authenticate.js";
import { authorizeRole } from "../../../shared/middlewares/authorize-role.js";

import { createSupabaseAdminClient } from "../../../infrastructure/supabase/admin-client.js";

import {
  CreateAiAnalysisUseCase,
  type AiPhotoUpload,
  type CreatedAiAnalysis,
} from "../application/use-cases/create-ai-analysis.use-case.js";

import { SupabaseAiAnalysisRepository } from "../infrastructure/supabase-ai-analysis.repository.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PHOTO_SIZE_BYTES,
    files: OCCURRENCE_PHOTOS_MAX,
    fields: 0,
    parts: OCCURRENCE_PHOTOS_MAX,
  },
}).array("photos", OCCURRENCE_PHOTOS_MAX);

const receivePhotos: RequestHandler = (req, res, next) => {
  if (!req.is("multipart/form-data")) {
    next(new BadRequestError("Envie as fotografias usando multipart/form-data."));
    return;
  }

  upload(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(
          new AppError(
            413,
            "PAYLOAD_TOO_LARGE",
            `Cada fotografia deve ter no máximo ${MAX_PHOTO_SIZE_BYTES / 1024 / 1024} MB.`,
          ),
        );
        return;
      }
      next(
        new BadRequestError(
          `Envie no máximo ${OCCURRENCE_PHOTOS_MAX} arquivos no campo photos.`,
        ),
      );
      return;
    }
    if (error) {
      next(error);
      return;
    }
    next();
  });
};

type ExecuteUpload = (
  userId: string,
  photos: AiPhotoUpload[],
) => Promise<CreatedAiAnalysis>;

export function createAiAnalysisRoutes(
  execute: ExecuteUpload,
  authentication: RequestHandler = authenticate,
  authorization: RequestHandler = authorizeRole(["CITIZEN"]),
) {
  const router = Router();

  router.post(
    "/",
    authentication,
    authorization,
    receivePhotos,
    async (req, res, next) => {
      try {
        const userId = req.user?.id;
        if (!userId) throw new UnauthorizedError();

        const photos = Array.isArray(req.files) ? req.files : [];
        const result = await execute(userId, photos);

        res.status(201).json({
          data: { id: result.id, status: result.status, photo_count: result.photoCount },
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

export const aiAnalysisRoutes = createAiAnalysisRoutes(
  async (userId, photos) => {
    const adminClient = createSupabaseAdminClient();
    const repository = new SupabaseAiAnalysisRepository(adminClient);
    const useCase = new CreateAiAnalysisUseCase(repository);
    return useCase.execute(userId, photos);
  },
);