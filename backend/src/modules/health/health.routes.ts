import { Router } from "express";
import { healthCheck } from "./health.controller.js";

const healthRoutes = Router();

healthRoutes.get("/", healthCheck);

export default healthRoutes;