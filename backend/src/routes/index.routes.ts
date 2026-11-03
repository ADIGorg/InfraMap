import { Router } from 'express';
import healthRoutes from '../modules/health/health.routes.js';
import { identityRouter } from '../modules/identity/identity.routes.js';

const routes = Router();

routes.use('/health', healthRoutes);
routes.use('/identity', identityRouter);

export default routes;