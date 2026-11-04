import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";

export const supabaseAuth = createClient(
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
