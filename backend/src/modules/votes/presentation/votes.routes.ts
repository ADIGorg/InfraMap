import { Router } from "express";
import { authenticate } from "../../../shared/middlewares/authenticate.js";
import { authorizeRole } from "../../../shared/middlewares/authorize-role.js";
import { validateRequest } from "../../../shared/middlewares/validate-request.js";
import { add, count, remove } from "./votes.controller.js";
import { voteParams } from "./votes.schema.js";

export const votesRoutes = Router();
const params = validateRequest({ params: voteParams });
const citizen = authorizeRole(["CITIZEN"]);

votesRoutes.get("/:id/votes", params, count);
votesRoutes.post("/:id/votes", authenticate, citizen, params, add);
votesRoutes.delete("/:id/votes/me", authenticate, citizen, params, remove);
