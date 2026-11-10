
import type {
  Request,
  Response,
  RequestHandler,
} from "express";

import {
  GetCurrentUserUseCase,
} from "../application/use-cases/get-current-user.use-case.js";

import type {
  IdentityRole,
} from "../domain/entities/user-profile.entity.js";

import type {
  ProfileReader,
} from "../domain/repositories/identity.repository.js";

// Contexto fornecido pela autenticação validada.
export interface IdentityContext {
  userId: string;
  profiles: ProfileReader;
}

export type ResolveIdentityContext = (
  request: Request,
  response: Response
) => IdentityContext;

// Controller responsável pela camada HTTP.
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

        const useCase = new GetCurrentUserUseCase(
          context.profiles
        );

        const identity = await useCase.execute(
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
