
import type {
  Request,
  Response,
  RequestHandler,
} from "express";

import { IdentityService } from "./identity.service.js";

import type {
  IdentityRole,
  ProfileReader,
} from "./identity.service.js";

// Contexto fornecido pela autenticação validada.
export interface IdentityContext {
  userId: string;
  profiles: ProfileReader;
}

export type ResolveIdentityContext = (
  request: Request,
  response: Response
) => IdentityContext;

// Cria os controllers com as dependências necessárias.
export function createIdentityController(
  resolveContext: ResolveIdentityContext
) {
  const getMe = (
    requiredRole: IdentityRole
  ): RequestHandler => {

    return async (request, response, next) => {
      try {
        const context = resolveContext(
          request,
          response
        );

        const service = new IdentityService(
          context.profiles
        );

        const identity = await service.getMe(
          context.userId,
          requiredRole
        );

        response.status(200).json(identity);
      } catch (error) {
        next(error);
      }
    };
  };

  return {
    appMe: getMe("CITIZEN"),
    adminMe: getMe("ADMIN"),
  };
}
