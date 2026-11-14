// src/modules/identity/presentation/identity.routes.ts

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
} from "../domain/entities/user-profile.entity.js";

import { authenticate } from "../../../shared/middlewares/authenticate.js";
import { authorizeRole } from "../../../shared/middlewares/authorize-role.js";

// ==========================================
// ROTAS DE IDENTIDADE
// ==========================================
// Rotas provisórias POST /users, GET /users, GET /users/:id e GET /me
// foram REMOVIDAS em DOC-01 (anexo 05 §9: "não são contratos válidos —
// serão removidos"). O perfil autenticado vive em `my-profile.routes.ts`;
// a identidade autenticada vive em `createIdentityRoutes` abaixo.
// `/admin-check` é mantido por compatibilidade com clientes existentes.
//
// `identity.schema.ts` fica órfão até limpeza futura — não é referenciado
// por nenhuma rota ativa.

export const identityRouter = Router();

identityRouter.get(
  "/admin-check",
  authenticate,
  authorizeRole(["ADMIN"]),
  (_req, res) => {
    return res.status(200).json({
      message: "Acesso administrativo autorizado.",
    });
  },
);

// ==========================================
// API1-13 — ROTAS DE IDENTIDADE DO USUÁRIO
// ==========================================

interface IdentityRoutesDependencies {
  authenticate: RequestHandler;

  authorizeRole: (
    role: IdentityRole,
  ) => RequestHandler;

  resolveContext: ResolveIdentityContext;
}

export function createIdentityRoutes(
  dependencies: IdentityRoutesDependencies,
) {
  const router = Router();

  const controller = createIdentityController(
    dependencies.resolveContext,
  );

  // Identificação do cidadão autenticado.
  router.get(
    "/app/me",
    dependencies.authenticate,
    dependencies.authorizeRole("CITIZEN"),
    controller.appMe,
  );

  // Identificação do administrador autenticado.
  router.get(
    "/admin/me",
    dependencies.authenticate,
    dependencies.authorizeRole("ADMIN"),
    controller.adminMe,
  );

  return router;
}