import type { Request, Response } from "express";
import type { z } from "zod";
import { createUserSupabaseClient } from "../../../infrastructure/supabase/user-client.factory.js";
import { UnauthorizedError } from "../../../shared/errors/app-error.js";
import { createAgencyRepository } from "../infrastructure/repositories/supabase-agency.repository.js";
import type { createAgencySchema, updateAgencySchema } from "./agencies.schema.js";

function repositoryFor(req: Request) {
  if (!req.token) throw new UnauthorizedError();
  return createAgencyRepository(createUserSupabaseClient(req.token));
}

export async function listAgencies(req: Request, res: Response) {
  res.json({ data: await repositoryFor(req).list() });
}

export async function createAgency(req: Request, res: Response) {
  const body = req.validated?.body as z.infer<typeof createAgencySchema>;
  res.status(201).json({ data: await repositoryFor(req).create(body) });
}

export async function updateAgency(req: Request, res: Response) {
  const { id } = req.validated?.params as { id: string };
  const body = req.validated?.body as z.infer<typeof updateAgencySchema>;
  res.json({ data: await repositoryFor(req).update(id, body) });
}
