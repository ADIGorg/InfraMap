
import {
  Router,
  type RequestHandler,
} from "express";

import multer from "multer";

import {
  AppError,
  BadRequestError,
  UnauthorizedError,
} from "../../../shared/errors/app-error.js";

import {
  authenticate,
} from "../../../shared/middlewares/authenticate.js";

import {
  authorizeRole,
} from "../../../shared/middlewares/authorize-role.js";

import {
  createSupabaseAdminClient,
} from "../../../infrastructure/supabase/admin-client.js";

import {
  CreateAiAnalysisUseCase,
  MAX_PHOTO_SIZE,
  type AiPhotoUpload,
  type CreatedAiAnalysis,
} from "../application/use-cases/create-ai-analysis.use-case.js";

import {
  SupabaseAiAnalysisRepository,
} from "../infrastructure/supabase-ai-analysis.repository.js";

// Recebe até 3 arquivos de 5 MB.
// Apenas multipart/form-data.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PHOTO_SIZE,
    files: 3,
    fields: 0,
    parts: 3,
  },
}).array("photos", 3);

const receivePhotos: RequestHandler = (
  req,
  res,
  next
) => {
  if (!req.is("multipart/form-data")) {
    next(new BadRequestError(
      "Envie as fotografias usando multipart/form-data."
    ));
    return;
  }

  upload(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(new AppError(
          413,
          "PAYLOAD_TOO_LARGE",
          "Cada fotografia deve ter no máximo 5 MB."
        ));
        return;
      }

      next(new BadRequestError(
        "Envie no máximo 3 arquivos no campo photos."
      ));
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
  photos: AiPhotoUpload[]
) => Promise<CreatedAiAnalysis>;

export function createAiAnalysisRoutes(
  execute: ExecuteUpload,
  authentication: RequestHandler = authenticate,
  authorization: RequestHandler =
    authorizeRole(["CITIZEN"])
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

        if (!userId) {
          throw new UnauthorizedError();
        }

        const photos = Array.isArray(req.files)
          ? req.files
          : [];

        const result = await execute(
          userId,
          photos
        );

        res.status(201).json({
          data: {
            id: result.id,
            status: result.status,
            photo_count: result.photoCount,
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

// Composição real.
// A chave administrativa permanece no backend.
export const aiAnalysisRoutes =
  createAiAnalysisRoutes(
    async (userId, photos) => {
      const adminClient =
        createSupabaseAdminClient();

      const repository =
        new SupabaseAiAnalysisRepository(
          adminClient
        );

      const useCase =
        new CreateAiAnalysisUseCase(
          repository
        );

      return useCase.execute(userId, photos);
    }
  );
