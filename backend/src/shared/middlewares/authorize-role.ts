// src/shared/middlewares/authorize-role.ts

import type { Request, Response, NextFunction } from "express";

import { createUserSupabaseClient } from "../../infrastructure/supabase/user-client.factory.js";
import {
  AppError,
  UnauthorizedError,
  ForbiddenError,
} from "../errors/app-error.js";

export function authorizeRole(allowedRoles: readonly string[]) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user || !req.token) {
        throw new UnauthorizedError("Usuário não autenticado.");
      }

      const userClient = createUserSupabaseClient(req.token);

      const { data: userRole, error } = await userClient
        .from("user_roles")
        .select("role, is_active")
        .eq("user_id", req.user.id)
        .maybeSingle();

      if (error) {
        throw new AppError(
          500,
          "ROLE_LOOKUP_FAILED",
          "Não foi possível verificar as permissões do usuário.",
        );
      }

      if (!userRole) {
        throw new ForbiddenError("Perfil de usuário não encontrado.");
      }

      if (!userRole.is_active) {
        throw new ForbiddenError("Esta conta está inativa.");
      }

      if (!allowedRoles.includes(userRole.role)) {
        throw new ForbiddenError(
          "Você não possui permissão para acessar este recurso.",
        );
      }

      // Disponibiliza o papel para controllers/handlers posteriores.
      req.userRole = userRole.role as "CITIZEN" | "ADMIN";

      next();
    } catch (error) {
      next(error);
    }
  };
}