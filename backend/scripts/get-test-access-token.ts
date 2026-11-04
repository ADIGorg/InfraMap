import "dotenv/config";
import process from "node:process";

import { supabaseAuth } from "../src/infrastructure/supabase/auth-client.js";

async function main() {
  const email = process.env.TEST_USER_EMAIL?.trim();
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Informe TEST_USER_EMAIL e TEST_USER_PASSWORD no .env."
    );
  }

  // Realiza login no Supabase Auth.
  const { data, error } =
    await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    throw new Error(`Erro no login: ${error.message}`);
  }

  if (!data.session) {
    throw new Error("O Supabase não retornou uma sessão autenticada.");
  }

  console.log("Login realizado com sucesso!");
  console.log("Usuário:", data.user.email);
  console.log("ID:", data.user.id);

  console.log("\nAccess Token:");
  console.log(data.session.access_token);
}

main().catch((error: unknown) => {
  console.error(
    "Falha ao obter Access Token:",
    error instanceof Error ? error.message : error
  );

  process.exitCode = 1;
});