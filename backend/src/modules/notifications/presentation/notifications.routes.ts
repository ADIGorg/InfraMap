import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate.js";
import { authorizeRole } from "../../../shared/middlewares/authorize-role.js";
import { validateRequest } from "../../../shared/middlewares/validate-request.js";
import { list, markRead, markAllRead } from "./notifications.controller.js";
import { notificationParams, notificationQuery } from "./notifications.schema.js";

export const notificationsRoutes = Router();
notificationsRoutes.use(authenticate, authorizeRole(["CITIZEN"]));
notificationsRoutes.get("/", validateRequest({ query: notificationQuery }), list);
notificationsRoutes.patch("/read-all", markAllRead);
notificationsRoutes.patch("/:id/read", validateRequest({ params: notificationParams }), markRead);
