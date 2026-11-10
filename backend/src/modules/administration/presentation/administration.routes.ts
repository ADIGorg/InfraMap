import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate.js";
import { authorizeRole } from "../../../shared/middlewares/authorize-role.js";
import { dashboard } from "./administration.controller.js";
import { validateRequest } from "../../../shared/middlewares/validate-request.js";
import { createAdmin, listAdmins, requireMaster, updateAdmin } from "./admin-management.controller.js";
import { adminIdSchema, createAdminSchema, updateAdminSchema } from "./admin-management.schema.js";

export const administrationRoutes = Router();
administrationRoutes.get("/dashboard", authenticate, authorizeRole(["ADMIN"]), dashboard);
administrationRoutes.get("/admins", authenticate, requireMaster, listAdmins);
administrationRoutes.post("/admins", authenticate, requireMaster, validateRequest({ body: createAdminSchema }), createAdmin);
administrationRoutes.patch("/admins/:id", authenticate, requireMaster, validateRequest({
  params: adminIdSchema, body: updateAdminSchema,
}), updateAdmin);
