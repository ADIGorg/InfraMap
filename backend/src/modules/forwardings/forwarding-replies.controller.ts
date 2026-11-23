import type { Request, Response } from "express";
import { z } from "zod";
import { createUserSupabaseClient } from "../../infrastructure/supabase/user-client.factory.js";
import { UnauthorizedError } from "../../shared/errors/app-error.js";
import { listForwardingReplies } from "./forwarding-replies.repository.js";

const paramsSchema = z.object({ id: z.uuid(), forwardingId: z.uuid() });

export async function listReplies(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.token) throw new UnauthorizedError();
  const { id, forwardingId } = paramsSchema.parse(req.params);
  const data = await listForwardingReplies(createUserSupabaseClient(req.token), id, forwardingId);
  res.json({ data });
}
