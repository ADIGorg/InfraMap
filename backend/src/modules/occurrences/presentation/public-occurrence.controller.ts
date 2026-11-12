import type { Request, Response } from "express";

import { supabasePublic } from "../../../infrastructure/supabase/public-client.js";
import { createSupabaseAdminClient } from "../../../infrastructure/supabase/admin-client.js";

import { SupabaseOccurrenceQueryRepository } from "../infrastructure/repositories/supabase-occurrence-query.repository.js";
import { SupabasePhotoUrlService } from "../../../infrastructure/storage/supabase-photo-url.service.js";
import { ListPublicOccurrencesUseCase } from "../application/use-cases/list-public-occurrences.use-case.js";
import { GetPublicOccurrenceUseCase } from "../application/use-cases/get-public-occurrence.use-case.js";

import type { ListFilters } from "../domain/repositories/occurrence-query.repository.js";

export class PublicOccurrenceController {
  async list(req: Request, res: Response) {
    const repo = new SupabaseOccurrenceQueryRepository(supabasePublic);
    const useCase = new ListPublicOccurrencesUseCase(repo);
    const result = await useCase.execute(req.validated?.query as ListFilters);
    return res.status(200).json(result);
  }

  async detail(req: Request, res: Response) {
    const repo = new SupabaseOccurrenceQueryRepository(supabasePublic);
    const adminClient = createSupabaseAdminClient();
    const photoSvc = new SupabasePhotoUrlService(adminClient);
    const useCase = new GetPublicOccurrenceUseCase(repo, photoSvc);
    const result = await useCase.execute(req.params.id as string);
    return res.status(200).json({ data: result });
  }
}