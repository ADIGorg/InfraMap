import type { Request, Response } from "express";

import { UnauthorizedError } from "../../../shared/errors/app-error.js";
import { createUserSupabaseClient } from "../../../infrastructure/supabase/user-client.factory.js";
import { createSupabaseAdminClient } from "../../../infrastructure/supabase/admin-client.js";

import { SupabaseOccurrenceQueryRepository } from "../infrastructure/repositories/supabase-occurrence-query.repository.js";
import { SupabasePhotoUrlService } from "../../../infrastructure/storage/supabase-photo-url.service.js";
import { ListMyOccurrencesUseCase } from "../application/use-cases/list-my-occurrences.use-case.js";
import { GetMyOccurrenceUseCase } from "../application/use-cases/get-my-occurrence.use-case.js";

import type { ListFilters } from "../domain/repositories/occurrence-query.repository.js";

export class MyOccurrenceController {
  async list(req: Request, res: Response) {
    if (!req.user || !req.token) throw new UnauthorizedError();
    const userClient = createUserSupabaseClient(req.token);
    const repo = new SupabaseOccurrenceQueryRepository(userClient);
    const useCase = new ListMyOccurrencesUseCase(repo);
    const result = await useCase.execute(req.user.id, req.validated?.query as ListFilters);
    return res.status(200).json(result);
  }

  async detail(req: Request, res: Response) {
    if (!req.user || !req.token) throw new UnauthorizedError();
    const userClient = createUserSupabaseClient(req.token);
    const adminClient = createSupabaseAdminClient();
    const repo = new SupabaseOccurrenceQueryRepository(userClient);
    const photoSvc = new SupabasePhotoUrlService(adminClient);
    const useCase = new GetMyOccurrenceUseCase(repo, photoSvc);
    const result = await useCase.execute(req.user.id, req.params.id as string);
    return res.status(200).json({ data: result });
  }
}