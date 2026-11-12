// src/server.ts

// Carrega .env antes de qualquer import que leia process.env.
// Precisa ser a primeira import.
import "dotenv/config";

import { env } from "./config/env.js";
import { createApp } from "./app.js";

// ==========================================
// COMPOSITION ROOT
// ==========================================
// Nenhum client Supabase é criado aqui.
// `env.ts` valida SUPABASE_URL/PUBLISHABLE_KEY/SECRET_KEY
// no import — fail-fast garantido. Cada módulo cria seus
// clientes por requisição, com o JWT correto.
// ==========================================

const app = createApp();

app.listen(env.port, () => {
  console.log(`InfraMap API executando na porta ${env.port}`);
  console.log(`Ambiente: ${env.nodeEnv}`);
});