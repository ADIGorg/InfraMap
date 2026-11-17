import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
