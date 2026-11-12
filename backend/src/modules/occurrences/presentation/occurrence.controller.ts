import type { Request, Response } from "express";

import { UnauthorizedError } from "../../../shared/errors/app-error.js";
import { createUserSupabaseClient } from "../../../infrastructure/supabase/user-client.factory.js";
import { createSupabaseAdminClient } from "../../../infrastructure/supabase/admin-client.js";

import type { FinalizeOccurrenceInput } from "../domain/repositories/occurrence.repository.js";
import { SupabaseOccurrenceRepository } from "../infrastructure/repositories/supabase-occurrence.repository.js";
import { FinalizeOccurrenceUseCase } from "../application/use-cases/finalize-occurrence.use-case.js";

export class FinalizeOccurrenceController {
  async handle(req: Request, res: Response) {
    if (!req.user || !req.token) throw new UnauthorizedError();

    const userClient = createUserSupabaseClient(req.token);
    const adminClient = createSupabaseAdminClient();
    const repo = new SupabaseOccurrenceRepository(userClient, adminClient);
    const useCase = new FinalizeOccurrenceUseCase(repo);

    const body = req.validated?.body as FinalizeOccurrenceInput;
    const result = await useCase.execute(req.user.id, body);

    return res.status(201).json({
      message: "Ocorrência registrada com sucesso.",
      data: result,
    });
  }
}