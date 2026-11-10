
import { createClient } from "@supabase/supabase-js";

import { env } from "../../config/env.js";

// Cliente público para consultas permitidas pela RLS.
// Usa a chave publicável, sem credenciais privilegiadas.
export const supabasePublic = createClient(
  env.supabase.url,
  env.supabase.publishableKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);
