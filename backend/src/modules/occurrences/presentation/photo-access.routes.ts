import { Router } from "express";

import { authenticate } from "../../../shared/middlewares/authenticate.js";
import { authorizeRole } from "../../../shared/middlewares/authorize-role.js";
import { validateRequest } from "../../../shared/middlewares/validate-request.js";

import { PhotoAccessController } from "./photo-access.controller.js";
import { photoAccessParamsSchema } from "./photo-access.schema.js";

export interface PhotoAccessRouters {
  publicRouter: Router;
  myRouter: Router;
  adminRouter: Router;
}

export function createPhotoAccessRoutes(): PhotoAccessRouters {
  const validateParams = validateRequest({ params: photoAccessParamsSchema.shape.params });

  const publicRouter = Router();
  publicRouter.get("/:id/photos/:photoId", validateParams,
    (req, res, next) => new PhotoAccessController("PUBLIC").handle(req, res).catch(next));

  const myRouter = Router();
  myRouter.use(authenticate);
  myRouter.get("/:id/photos/:photoId", validateParams,
    (req, res, next) => new PhotoAccessController("OWNER").handle(req, res).catch(next));

  const adminRouter = Router();
  adminRouter.use(authenticate);
  adminRouter.use(authorizeRole(["ADMIN"]));
  adminRouter.get("/:id/photos/:photoId", validateParams,
    (req, res, next) => new PhotoAccessController("ADMIN").handle(req, res).catch(next));

  return { publicRouter, myRouter, adminRouter };
}