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

import { authenticate } from "../../shared/middlewares/authenticate.js";
import { authorizeRole } from "../../shared/middlewares/authorize-role.js";
import { validateRequest } from "../../shared/middlewares/validate-request.js";

import {
  createUserBodySchema,
  getUserParamsSchema,
  getUsersQuerySchema,
} from "./identity.schema.js";

// ==========================================
// ROTAS ANTERIORES DE IDENTIDADE
// ==========================================

// Estas rotas permanecem agrupadas em /identity.
// Exemplo: /api/v1/identity/users

export const identityRouter = Router();

// Apenas administradores podem criar usuários.
// A implementação da criação será tratada em outro ticket.
identityRouter.post(
  "/users",
  authenticate,
  authorizeRole(["ADMIN"]),
  validateRequest({ body: createUserBodySchema }),
  (req, res) => {
    return res.status(201).json({
      message: "Usuário validado e pronto para criação.",
      data: req.body,
    });
  }
);

// Validação de parâmetros da URL.
identityRouter.get(
  "/users/:id",
  authenticate,
  validateRequest({ params: getUserParamsSchema }),
  (req, res) => {
    return res.status(200).json({
      message: `Buscando usuário ${req.params.id}`,
    });
  }
);

// Identificação básica do usuário autenticado.
identityRouter.get(
  "/me",
  authenticate,
  (req, res) => {
    const user = req.user!;

    return res.status(200).json({
      message: "Usuário autenticado.",
      data: {
        id: user.id,
        email: user.email,
      },
    });
  }
);

// Verificação de acesso administrativo.
identityRouter.get(
  "/admin-check",
  authenticate,
  authorizeRole(["ADMIN"]),
  (_req, res) => {
    return res.status(200).json({
      message: "Acesso administrativo autorizado.",
    });
  }
);

// Validação dos parâmetros de consulta.
identityRouter.get(
  "/users",
  authenticate,
  validateRequest({ query: getUsersQuerySchema }),
  (req, res) => {
    return res.status(200).json({
      message: "Parâmetros validados com sucesso.",
      data: req.validated?.query,
    });
  }
);

// ==========================================
// API-13 - ROTAS DE IDENTIDADE DO USUÁRIO
// ==========================================

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