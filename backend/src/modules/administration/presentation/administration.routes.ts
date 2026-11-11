import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate.js";
import { authorizeRole } from "../../../shared/middlewares/authorize-role.js";
import { dashboard } from "./administration.controller.js";
import { validateRequest } from "../../../shared/middlewares/validate-request.js";
import { createAdmin, listAdmins, requireMaster, updateAdmin } from "./admin-management.controller.js";
import { adminIdSchema, createAdminSchema, updateAdminSchema } from "./admin-management.schema.js";
import { createAgency, listAgencies, updateAgency } from "./agencies.controller.js";
import { agencyIdSchema, createAgencySchema, updateAgencySchema } from "./agencies.schema.js";

export const administrationRoutes = Router();
administrationRoutes.get("/agencies", authenticate, authorizeRole(["ADMIN"]), listAgencies);
administrationRoutes.post("/agencies", authenticate, requireMaster, validateRequest({ body: createAgencySchema }), createAgency);
administrationRoutes.patch("/agencies/:id", authenticate, requireMaster, validateRequest({
  params: agencyIdSchema, body: updateAgencySchema,
}), updateAgency);
administrationRoutes.get("/dashboard", authenticate, authorizeRole(["ADMIN"]), dashboard);
administrationRoutes.get("/admins", authenticate, requireMaster, listAdmins);
administrationRoutes.post("/admins", authenticate, requireMaster, validateRequest({ body: createAdminSchema }), createAdmin);
administrationRoutes.patch("/admins/:id", authenticate, requireMaster, validateRequest({
  params: adminIdSchema, body: updateAdminSchema,
}), updateAdmin);
