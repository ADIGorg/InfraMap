import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";

export function createUserSupabaseClient(accessToken: string) {
  if (!accessToken?.trim()) {
    throw new Error("Token de acesso não informado.");
  }

  return createClient(
    env.supabase.url,
    env.supabase.publishableKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}

