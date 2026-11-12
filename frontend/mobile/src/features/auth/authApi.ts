import { authRequest, saveSession } from "../../shared/http";
export const recoverPassword = (email: string) => authRequest("recover", { email: email.trim() });
export interface Credentials { email: string; password: string; name: string }

export async function authenticate(mode: "login" | "register", input: Credentials): Promise<string> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const api = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
  if (!url || !key || !api) {
    throw new Error("A conexão de acesso ainda precisa ser configurada. Tente novamente mais tarde.");
  }
  const endpoint = mode === "login" ? "token?grant_type=password" : "signup";
  const response = await fetch(`${url}/auth/v1/${endpoint}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email.trim(), password: input.password,
      ...(mode === "register" ? { data: { name: input.name.trim() } } : {}),
    }),
  });
  if (!response.ok) {
    if (response.status === 429) throw new Error("Aguarde um pouco antes de tentar novamente.");
    throw new Error(mode === "login"
      ? "Não foi possível entrar. Confira o e-mail, a senha e a confirmação do e-mail."
      : "Não foi possível criar a conta. Confira os dados e tente novamente.");
  }
  const result = await response.json();
  if (typeof result.access_token !== "string") {
    if (mode === "register") return "Confira seu e-mail para confirmar o cadastro e depois entre na sua conta.";
    throw new Error("Não foi possível iniciar a sessão.");
  }
  const identity = await fetch(`${api}/app/me`, {
    headers: { Authorization: `Bearer ${result.access_token}` },
  });
  if (!identity.ok) throw new Error("Não foi possível validar o acesso de cidadão. Tente novamente.");
  const citizen = await identity.json();
  if (citizen.role !== "CITIZEN" || citizen.is_active !== true) {
    throw new Error("O acesso exige uma conta de cidadão ativa.");
  }
  await saveSession(result);
  return "Acesso confirmado.";
}
