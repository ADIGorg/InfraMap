// src/infrastructure/supabase/public-client.ts

/**
 * Cliente público (anon key) para consultas permitidas pela RLS.
 *
 * Tecnicamente é o mesmo client do `auth-client` — mesma URL + mesma
 * publishableKey. Mantido como alias semântico para deixar explícito,
 * nos call sites, o contexto de uso:
 *  - `auth-client`  → autenticação, validação de JWT (`getUser`)
 *  - `public-client` → leitura anônima respeitando RLS
 *
 * Se um dia precisar de config diferente (ex.: rate limit próprio),
 * este é o lugar para divergir.
 */
export { supabaseAuth as supabasePublic } from "./auth-client.js";