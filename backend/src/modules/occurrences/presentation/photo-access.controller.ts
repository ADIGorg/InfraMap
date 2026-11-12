import type { Request, Response } from "express";

import { UnauthorizedError } from "../../../shared/errors/app-error.js";
import { createUserSupabaseClient } from "../../../infrastructure/supabase/user-client.factory.js";
import { createSupabaseAdminClient } from "../../../infrastructure/supabase/admin-client.js";

import { SupabasePhotoAccessRepository } from "../infrastructure/repositories/supabase-photo-access.repository.js";
import { SupabasePhotoUrlService } from "../../../infrastructure/storage/supabase-photo-url.service.js";
import { GetPhotoSignedUrlUseCase } from "../application/use-cases/get-photo-signed-url.use-case.js";

export class PhotoAccessController {
  constructor(private readonly defaultRole: "PUBLIC" | "OWNER" | "ADMIN") {}

  async handle(req: Request, res: Response) {
    const occurrenceId = req.params.id as string;
    const photoId = req.params.photoId as string;

    // Repo: PUBLIC usa admin client (RLS bloqueia anon em occurrence_photos);
    //       OWNER/ADMIN usam user client (RLS restringe).
    // URL service: SEMPRE admin client (RLS de storage.objects é deny-by-default).
    let repoClient;
    if (this.defaultRole === "PUBLIC") {
      repoClient = createSupabaseAdminClient();
    } else {
      if (!req.user || !req.token) throw new UnauthorizedError();
      repoClient = createUserSupabaseClient(req.token);
    }

    const repo = new SupabasePhotoAccessRepository(repoClient);
    const photoSvc = new SupabasePhotoUrlService(createSupabaseAdminClient());
    const useCase = new GetPhotoSignedUrlUseCase(repo, photoSvc);

    const requester =
      this.defaultRole === "OWNER"
        ? { role: "OWNER" as const, userId: req.user!.id }
        : { role: this.defaultRole };

    const result = await useCase.execute(requester, occurrenceId, photoId);
    return res.status(200).json({ data: result });
  }
}