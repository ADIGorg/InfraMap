
import {
  Router,
  type RequestHandler,
} from "express";

import {
  createIdentityController,
  type ResolveIdentityContext,
} from "./identity.controller.js";

import type {
  IdentityRole,
} from "./identity.service.js";

interface IdentityRoutesDependencies {
  authenticate: RequestHandler;

  authorizeRole: (
    role: IdentityRole
  ) => RequestHandler;

  resolveContext: ResolveIdentityContext;
}

export function createIdentityRoutes(
  dependencies: IdentityRoutesDependencies
) {
  const router = Router();

  const controller = createIdentityController(
    dependencies.resolveContext
  );

  // Identificação do cidadão autenticado.
  router.get(
    "/app/me",
    dependencies.authenticate,
    dependencies.authorizeRole("CITIZEN"),
    controller.appMe
  );

  // Identificação do administrador autenticado.
  router.get(
    "/admin/me",
    dependencies.authenticate,
    dependencies.authorizeRole("ADMIN"),
    controller.adminMe
  );

  return router;
}
import { Router } from 'express';
import { authenticate } from '../../shared/middlewares/authenticate.js';
import { authorizeRole } from '../../shared/middlewares/authorize-role.js';
import { validateRequest } from '../../shared/middlewares/validate-request.js';
import { createUserBodySchema, getUserParamsSchema } from './identity.schema.js';
import {getUsersQuerySchema} from './identity.schema.js';

const identityRouter = Router();

// Rota Protegida: Apenas Admin pode criar novos usuários
identityRouter.post(
    '/users',
    authenticate,
    authorizeRole(['ADMIN']),
    validateRequest({ body: createUserBodySchema }), // <--- Middleware do Zod
    (req, res) => {
        // Se chegou aqui, o req.body está 100% limpo e tipado (name, email, password, role)
        // Nenhum campo extra enviado pelo frontend passou por esta barreira.
        return res.status(201).json({
            message: 'Usuário validado e pronto para criação.',
            data: req.body,
        });
    }
);

// Exemplo usando Params
identityRouter.get(
    '/users/:id',
    authenticate,
    validateRequest({ params: getUserParamsSchema }),
    (req, res) => {
        return res.status(200).json({ message: `Buscando usuário ${req.params.id}` });
    }
);

identityRouter.get(
    '/me',
    authenticate,
    (req, res) => {
        const user = req.user!;

        return res.status(200).json({
            message: 'Usuário autenticado.',
            data: {
                id: user.id,
                email: user.email,
            },
        });
    }
);

identityRouter.get(
    '/admin-check',
    authenticate,
    authorizeRole(['ADMIN']),
    (_req, res) => {
        return res.status(200).json({
            message: 'Acesso administrativo autorizado.',
        });
    }
);

identityRouter.get(
    '/users',
    authenticate,
    validateRequest({ query: getUsersQuerySchema }),
    (req, res) => {
        return res.status(200).json({
            message: 'Parâmetros validados com sucesso.',
            data: req.validated?.query,
        });
    }
);

export { identityRouter };
