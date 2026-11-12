/** Helpers de QA-02/QA-03. Exclusivamente para stack Supabase local. */
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "";
const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const service = process.env.SUPABASE_SECRET_KEY ?? "";

export type QaUser = {
  id: string;
  email: string;
  password: string;
  token: string;
  client: SupabaseClient;
};

export function ensureLocalQa(): void {
  let parsed: URL;
  try { parsed = new URL(url); }
  catch { throw new Error("QA requer SUPABASE_URL local válido."); }
  if (parsed.protocol !== "http:" ||
      !["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname)) {
    throw new Error("QA abortado: Supabase remoto não é permitido.");
  }
  if (!anon || !service) throw new Error("Chaves de teste Supabase local ausentes.");
}

export function qaServiceClient(): SupabaseClient {
  ensureLocalQa();
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function qaAnonClient(): SupabaseClient {
  ensureLocalQa();
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function createQaUser(
  adminClient: SupabaseClient,
  name: string,
  role: "CITIZEN" | "MASTER" | "OPERATIONAL" = "CITIZEN",
): Promise<QaUser> {
  const email = `qa-${randomUUID()}@example.com`;
  const password = `Qa!2026-${randomUUID()}`;
  const created = await adminClient.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name },
  });
  if (created.error || !created.data.user) {
    throw new Error(`Falha ao preparar usuário de QA: ${created.error?.message ?? "sem resposta"}`);
  }
  const id = created.data.user.id;
  if (role !== "CITIZEN") {
    const promoted = await adminClient.from("user_roles").update({
      role: "ADMIN", admin_level: role, is_active: true,
    }).eq("user_id", id).select("user_id").single();
    if (promoted.error) throw new Error(`Falha ao preparar role: ${promoted.error.message}`);
  }
  const anonymous = qaAnonClient();
  const signed = await anonymous.auth.signInWithPassword({ email, password });
  if (signed.error || !signed.data.session?.access_token) {
    throw new Error(`Falha no login de QA: ${signed.error?.message ?? "sem token"}`);
  }
  const token = signed.data.session.access_token;
  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return { id, email, password, token, client };
}

/** Remove dados transitórios conhecidos; evita qualquer operação sem prefixo QA. */
export async function removeQaUsers(admin: SupabaseClient, users: QaUser[]): Promise<void> {
  ensureLocalQa();
  for (const user of users) {
    if (!user.email.startsWith("qa-") || !user.email.endsWith("@example.com")) continue;
    // Dependências de domínio podem impedir a exclusão em alguns fluxos.
    // A execução em CI usa stack descartável; não mascarar falha de teste por cleanup.
    await admin.auth.admin.deleteUser(user.id);
  }
}

/** PNG mínimo com assinatura e chunk íntegros, reutilizável pelo upload multipart. */
export const qaPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9u0U3wAAAABJRU5ErkJggg==",
  "base64",
);
