import type { Request, Response } from "express";
import { createUserSupabaseClient } from "../../../infrastructure/supabase/user-client.factory.js";
import { UnauthorizedError } from "../../../shared/errors/app-error.js";
import { listNotifications } from "../application/use-cases/list-notifications.use-case.js";
import { markNotificationRead } from "../application/use-cases/mark-notification-read.use-case.js";
import { markAllNotificationsRead } from "../application/use-cases/mark-all-notifications-read.use-case.js";
import { createNotificationRepository } from "../infrastructure/repositories/supabase-notification.repository.js";

function repositoryFor(req: Request) {
  if (!req.user || !req.token) throw new UnauthorizedError();
  return createNotificationRepository(createUserSupabaseClient(req.token), req.user.id);
}

export async function list(req: Request, res: Response) {
  const { page, limit } = req.validated?.query as { page: number; limit: number };
  res.json(await listNotifications(repositoryFor(req), page, limit));
}

export async function markRead(req: Request, res: Response) {
  const { id } = req.validated?.params as { id: string };
  await markNotificationRead(repositoryFor(req), id);
  res.sendStatus(204);
}

export async function markAllRead(req: Request, res: Response) {
  await markAllNotificationsRead(repositoryFor(req));
  res.sendStatus(204);
}
