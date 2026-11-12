import type { Request, Response } from "express";

import { UnauthorizedError } from "../../../shared/errors/app-error.js";
import { createUserSupabaseClient } from "../../../infrastructure/supabase/user-client.factory.js";

import { createProfileReader } from "../../identity/infrastructure/repositories/supabase-identity.repository.js";

import { SupabaseOccurrenceModerationRepository } from "../../moderation/infrastructure/repositories/supabase-moderation.repository.js";
import { GetOccurrenceHistoryUseCase } from "../application/use-cases/get-occurrence-history.use-case.js";

export class OccurrenceHistoryController {
  async handle(req: Request, res: Response) {
    if (!req.user || !req.token) throw new UnauthorizedError();
    const id = req.params.id;
    if (typeof id !== "string" || id.length === 0) {
      return res.status(400).json({ message: "ID da ocorrência inválido." });
    }

    const userClient = createUserSupabaseClient(req.token);

    // Bug antigo: req.user.role é undefined (User do Supabase não tem role).
    // Fix: consulta user_roles via ProfileReader.
    const profile = await createProfileReader(userClient).findByUserId(req.user.id);
    const role = profile?.role === "ADMIN" ? "ADMIN" as const : "CITIZEN" as const;

    const repo = new SupabaseOccurrenceModerationRepository(userClient);
    const useCase = new GetOccurrenceHistoryUseCase(repo);
    const events = await useCase.execute({ userId: req.user.id, role }, id);

    return res.status(200).json({ data: events });
  }
}