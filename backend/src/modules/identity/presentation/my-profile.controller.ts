
import type {
  Request,
  RequestHandler,
} from "express";

import {
  BadRequestError,
} from "../../../shared/errors/app-error.js";

import {
  GetMyProfileUseCase,
} from "../application/use-cases/get-my-profile.use-case.js";

import {
  UpdateMyProfileUseCase,
} from "../application/use-cases/update-my-profile.use-case.js";

import type {
  AccountProfileRepository,
} from "../domain/repositories/profile.repository.js";

import type {
  ProfileReader,
} from "../domain/repositories/identity.repository.js";

import type {
  UpdateAccountProfileData,
} from "../domain/entities/account-profile.entity.js";

import type {
  UpdateProfileBody,
} from "./update-profile.schema.js";

// ==========================================
// CONTEXTO DO PERFIL
// ==========================================

export interface MyProfileContext {
  userId: string;
  email: string | null;

  accountProfiles: AccountProfileRepository;
  identities: ProfileReader;
}

export type ResolveMyProfileContext = (
  request: Request
) => MyProfileContext;

// ==========================================
// CONTROLLER DO PERFIL
// ==========================================

export function createMyProfileController(
  resolveContext: ResolveMyProfileContext
) {

  // ========================================
  // GET /identity/me
  // ========================================

  const getMe: RequestHandler = async (
    request,
    response,
    next
  ) => {
    try {
      const context = resolveContext(request);

      const useCase = new GetMyProfileUseCase(
        context.accountProfiles,
        context.identities
      );

      const profile = await useCase.execute(
        context.userId
      );

      response.status(200).json({
        message: "Usuário autenticado.",
        data: {
          ...profile,
          email: context.email,
        },
      });

    } catch (error) {
      next(error);
    }
  };

  // ========================================
  // PATCH /identity/me
  // ========================================

  const updateMe: RequestHandler = async (
    request,
    response,
    next
  ) => {
    try {
      const context = resolveContext(request);

      // Recupera os dados validados pelo Zod.
      const body = request.validated?.body as
        | UpdateProfileBody
        | undefined;

      if (!body) {
        throw new BadRequestError(
          "Dados de atualização não validados."
        );
      }

      // ====================================
      // NORMALIZAÇÃO DOS CAMPOS PERMITIDOS
      // ====================================

      // Cria um objeto compatível com
      // UpdateAccountProfileData.
      const changes: UpdateAccountProfileData = {};

      // Inclui o nome somente se informado.
      if (body.name !== undefined) {
        changes.name = body.name;
      }

      // Inclui o telefone somente se informado.
      // null é permitido para remover o telefone.
      if (body.phone !== undefined) {
        changes.phone = body.phone;
      }

      // Proteção adicional contra atualização vazia.
      if (Object.keys(changes).length === 0) {
        throw new BadRequestError(
          "Informe pelo menos um campo para atualização."
        );
      }

      // ====================================
      // EXECUÇÃO DO CASO DE USO
      // ====================================

      const useCase = new UpdateMyProfileUseCase(
        context.accountProfiles,
        context.identities
      );

      const profile = await useCase.execute(
        context.userId,
        changes
      );

      // ====================================
      // RESPOSTA HTTP
      // ====================================

      response.status(200).json({
        message: "Perfil atualizado com sucesso.",
        data: {
          ...profile,
          email: context.email,
        },
      });

    } catch (error) {
      next(error);
    }
  };

  return {
    getMe,
    updateMe,
  };
}
