import { supabaseAuth } from "../src/infrastructure/supabase/auth-client.js";

async function main() {
  const email = process.env.TEST_USER_EMAIL?.trim();
  const password = process.env.TEST_USER_PASSWORD;
  const name = process.env.TEST_USER_NAME?.trim();
  const phone = process.env.TEST_USER_PHONE?.trim();

  // Verifica se os dados necessários foram informados.
  if (!email || !password || !name) {
    throw new Error(
      "Informe TEST_USER_EMAIL, TEST_USER_PASSWORD e TEST_USER_NAME no .env."
    );
  }

  // Cria o usuário no Supabase Auth.
  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        phone: phone || null,
      },
    },
  });

  if (error) {
    throw new Error(`Erro ao cadastrar usuário: ${error.message}`);
  }

  if (!data.user) {
    throw new Error("O Supabase não retornou os dados do usuário.");
  }

  console.log("Usuário cadastrado com sucesso!");
  console.log("ID:", data.user.id);
  console.log("E-mail:", data.user.email);
  console.log(
    "E-mail confirmado:",
    data.user.email_confirmed_at ? "Sim" : "Pendente"
  );
  console.log(
    "Sessão criada:",
    data.session ? "Sim" : "Não (pode exigir confirmação de e-mail)"
  );
}

main().catch((error: unknown) => {
  console.error(
    "Falha no cadastro:",
    error instanceof Error ? error.message : error
  );

  process.exitCode = 1;
});