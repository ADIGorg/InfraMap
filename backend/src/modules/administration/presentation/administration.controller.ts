import type { Request, Response } from "express";
import { getDashboard } from "../application/use-cases/get-dashboard.use-case.js";
import { createAdministrationRepository } from "../infrastructure/repositories/supabase-administration.repository.js";
import { createUserSupabaseClient } from "../../../infrastructure/supabase/user-client.factory.js";
import { UnauthorizedError } from "../../../shared/errors/app-error.js";

export async function dashboard(req: Request, res: Response) {
  if (!req.token) throw new UnauthorizedError();
  const repository = createAdministrationRepository(createUserSupabaseClient(req.token));
  res.json({ data: await getDashboard(repository) });
}
