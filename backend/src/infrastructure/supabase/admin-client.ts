
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

/**
 * Cria um cliente administrativo do Supabase.
 *
 * A chave secreta nunca deve ser enviada ao
 * frontend, mobile ou incluída no Git.
 *
 * A criação é feita sob demanda, evitando
 * exigir a chave ao executar testes unitários.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim();

  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url || !secretKey) {
    throw new Error(
      "Configure SUPABASE_URL e SUPABASE_SECRET_KEY para operações administrativas."
    );
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
