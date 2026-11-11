import { Router, type RequestHandler } from "express";
import multer from "multer";
import { AppError, BadRequestError } from "../../../shared/errors/app-error.js";
import { authenticate } from "../../../shared/middlewares/authenticate.js";
import { authorizeRole } from "../../../shared/middlewares/authorize-role.js";
import { MAX_PHOTO_SIZE } from "../application/use-cases/create-ai-analysis.use-case.js";
import { createAnalysis, processAnalysis, getAnalysis } from "./ai-analysis.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_SIZE, files: 3, fields: 0, parts: 3 },
}).array("photos", 3);

const receivePhotos: RequestHandler = (req, res, next) => {
  if (!req.is("multipart/form-data")) {
    next(new BadRequestError("Envie as fotografias usando multipart/form-data."));
    return;
  }
  upload(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      next(error.code === "LIMIT_FILE_SIZE"
        ? new AppError(413, "PAYLOAD_TOO_LARGE", "Cada fotografia deve ter no máximo 5 MB.")
        : new BadRequestError("Envie no máximo 3 arquivos no campo photos."));
      return;
    }
    if (error) { next(error); return; }
    next();
  });
};

export function createAiAnalysisRoutes(
  authentication: RequestHandler = authenticate,
  authorization: RequestHandler = authorizeRole(["CITIZEN"])
) {
  const router = Router();
  router.post("/", authentication, authorization, receivePhotos, createAnalysis);
  router.post("/:id/analyze", authentication, authorization, processAnalysis);
  router.get("/:id", authentication, authorization, getAnalysis);
  return router;
}

export const aiAnalysisRoutes = createAiAnalysisRoutes();
