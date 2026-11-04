import { Router } from 'express';

import healthRoutes from '../modules/health/health.routes.js';

import { createIdentityRoutes } from '../modules/identity/identity.routes.js';
import { createProfileReader } from '../modules/identity/identity.repository.js';

import { authenticate } from '../shared/middlewares/authenticate.js';
import { authorizeRole } from '../shared/middlewares/authorize-role.js';

import { createUserSupabaseClient } from '../infrastructure/supabase/user-client.factory.js';

import { UnauthorizedError } from '../shared/errors/app-error.js';

const routes = Router();

// ==================================================
// HEALTH CHECK
// ==================================================

routes.use('/health', healthRoutes);

// ==================================================
// IDENTITY
// ==================================================

const identityRoutes = createIdentityRoutes({

    // Middleware de autenticação da main.
    authenticate,

    // Adaptação da assinatura do authorizeRole.
    // O colega utiliza uma string; a main recebe um array.
    authorizeRole: (role) => authorizeRole([role]),

    // Resolve a identidade autenticada e o acesso ao banco.
    resolveContext: (request) => {

        if (!request.user || !request.token) {
            throw new UnauthorizedError();
        }

        // Cria cliente Supabase utilizando o JWT do usuário.
        const userClient = createUserSupabaseClient(
            request.token
        );

        return {
            userId: request.user.id,
            profiles: createProfileReader(userClient),
        };
    },
});

// Registra os endpoints do módulo Identity.
routes.use(identityRoutes);
import healthRoutes from '../modules/health/health.routes.js';
import { identityRouter } from '../modules/identity/identity.routes.js';

const routes = Router();

routes.use('/health', healthRoutes);
routes.use('/identity', identityRouter);

export default routes;