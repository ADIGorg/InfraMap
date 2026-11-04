
/**
 * Ambiente dos testes automatizados.
 *
 * Valores fictícios utilizados para inicializar
 * os módulos que dependem do Supabase.
 */

if (process.env.RUN_SUPABASE_INTEGRATION !== "true") {
  process.env.SUPABASE_URL =
    "http://127.0.0.1:54321";

  process.env.SUPABASE_PUBLISHABLE_KEY =
    "test-only-placeholder";
}
