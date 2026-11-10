import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate.js";
import { authorizeRole } from "../../../shared/middlewares/authorize-role.js";
import { dashboard } from "./administration.controller.js";

export const administrationRoutes = Router();
administrationRoutes.get("/dashboard", authenticate, authorizeRole(["ADMIN"]), dashboard);
