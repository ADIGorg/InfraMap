// src/server.ts

// Carrega .env ANTES de qualquer import que leia process.env.
// Precisa ser a primeira import do arquivo.
import "dotenv/config";

import { env } from "./config/env.js";
import { createSupabaseAdminClient } from "./infrastructure/supabase/admin-client.js";
import { createApp } from "./app.js";

// ==========================================
// COMPOSITION ROOT
// ==========================================
// Aqui é o ÚNICO lugar onde o cliente admin é criado.
// Falha cedo (fail-fast) se SUPABASE_SECRET_KEY não estiver definido.
// ==========================================

const adminClient = createSupabaseAdminClient();
const app = createApp({ adminClient });

app.listen(env.port, () => {
  console.log(`InfraMap API executando na porta ${env.port}`);
  console.log(`Ambiente: ${env.nodeEnv}`);
});