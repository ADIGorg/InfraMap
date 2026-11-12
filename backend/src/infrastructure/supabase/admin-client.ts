// src/infrastructure/supabase/admin-client.ts

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "../../config/env.js";

/**
 * Cliente administrativo (service_role).
 *
 * Usar APENAS em operações que exigem bypass de RLS:
 *  - Upload/move de fotos no bucket `occurrence-photos`
 *  - Auth admin (createUser, updateUserById, signOut)
 *  - `account_deactivation_jobs` (service_role-only table)
 *  - `provision_administrator` (via app_metadata)
 *
 * NUNCA expor no frontend/mobile. NUNCA logar.
 * `env.ts` já validou `SUPABASE_SECRET_KEY` no boot — fail-fast coberto.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  return createClient(env.supabase.url, env.supabase.secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}