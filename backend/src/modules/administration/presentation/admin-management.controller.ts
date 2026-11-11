import type { Request, Response, NextFunction } from "express";
import type { z } from "zod";
import { createUserSupabaseClient } from "../../../infrastructure/supabase/user-client.factory.js";
import { createSupabaseAdminClient } from "../../../infrastructure/supabase/admin-client.js";
import { AppError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from "../../../shared/errors/app-error.js";
import type { createAdminSchema, updateAdminSchema } from "./admin-management.schema.js";

function context(req: Request) {
  if (!req.user || !req.token) throw new UnauthorizedError();
  return { actor: req.user.id, client: createUserSupabaseClient(req.token) };
}

function databaseError(code?: string): never {
  if (code === "42501") throw new ForbiddenError();
  if (code === "23514") throw new ConflictError("O último Master ativo deve ser preservado.");
  if (code === "P0002") throw new NotFoundError("Administrador não encontrado.");
  throw new AppError(500, "INTERNAL_SERVER_ERROR", "Não foi possível gerenciar administradores.");
}

export async function requireMaster(req: Request, _res: Response, next: NextFunction) {
  const { data, error } = await context(req).client.rpc("is_admin_master");
  if (error) databaseError(error.code);
  if (data !== true) throw new ForbiddenError("Apenas Master ativo.");
  next();
}

export async function listAdmins(req: Request, res: Response) {
  const { data, error } = await context(req).client.rpc("list_administrators");
  if (error) databaseError(error.code);
  res.json({ data });
}

export async function createAdmin(req: Request, res: Response) {
  const { actor } = context(req);
  const { name, email, password, admin_level } = req.validated?.body as z.infer<typeof createAdminSchema>;
  const { data, error } = await createSupabaseAdminClient().auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { name },
    app_metadata: { inframap_admin_provision: { created_by: actor, admin_level } },
  });
  if (error?.code === "email_exists" || error?.code === "user_already_exists") {
    throw new ConflictError("Já existe uma conta com esse e-mail.");
  }
  if (error || !data.user) databaseError();
  res.status(201).json({ data: { id: data.user.id, name, admin_level, is_active: true, created_by: actor } });
}

export async function updateAdmin(req: Request, res: Response) {
  const { id } = req.validated?.params as { id: string };
  const { admin_level, is_active } = req.validated?.body as z.infer<typeof updateAdminSchema>;
  const { data, error } = await context(req).client.rpc("update_administrator", {
    p_id: id, p_level: admin_level ?? null, p_active: is_active ?? null,
  });
  if (error) databaseError(error.code);
  res.json({ data });
}
