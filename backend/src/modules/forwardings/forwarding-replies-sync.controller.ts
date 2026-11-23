import type { Request, Response } from "express";
import { z } from "zod";
import { UnauthorizedError } from "../../shared/errors/app-error.js";
import { syncForwardingReplies } from "./forwarding-replies-sync.service.js";

const paramsSchema = z.object({ id: z.uuid() });

/** POST /admin/occurrences/:id/forwardings/sync */
export async function syncReplies(req: Request, res: Response): Promise<void> {
  if (!req.user || !req.token) throw new UnauthorizedError();
  const { id } = paramsSchema.parse(req.params);
  const data = await syncForwardingReplies(id);
  res.setHeader("Cache-Control", "no-store");
  res.json({ data });
}
