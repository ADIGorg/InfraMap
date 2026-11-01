import { Router } from "express";
import healthRoutes from "../modules/health/health.routes.js";

const routes = Router();

routes.use("/health", healthRoutes);

export default routes;