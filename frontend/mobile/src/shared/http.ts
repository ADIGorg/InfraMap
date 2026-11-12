import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";

interface Session { access_token: string; refresh_token: string; expires_at: number }
let session: Session | null = null;
let ready = false;
let version = 0;
const listeners = new Set<() => void>();
function notify() { version++; listeners.forEach((listener) => listener()); }
const key = "inframap.session";
let refreshPromise: Promise<string> | null = null;

export function useSession() {
  useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => version,
  );
  return { session, ready };
}

export async function restoreSession() {
  try {
    const value = await SecureStore.getItemAsync(key);
    if (value) {
      const saved = JSON.parse(value);
      if (typeof saved.access_token === "string" && typeof saved.refresh_token === "string"
        && typeof saved.expires_at === "number") session = saved;
    }
  } catch { session = null; }
  finally { ready = true; notify(); }
}

export async function saveSession(value: { access_token: string; refresh_token: string; expires_in: number }) {
  const next = { access_token: value.access_token, refresh_token: value.refresh_token,
    expires_at: Date.now() + value.expires_in * 1000 };
  await SecureStore.setItemAsync(key, JSON.stringify(next));
  session = next;
  notify();
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(key);
  session = null;
  notify();
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function send<T>(url: string, options: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const body = response.status === 204 ? undefined : await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new HttpError(response.status, (response.status >= 500 ? "O serviço está indisponível. Tente novamente mais tarde." : body?.error?.message)
        ?? (response.status === 429 ? "Aguarde um pouco e tente novamente." : "Não foi possível concluir a operação."));
    }
    return body as T;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new Error("Não foi possível conectar. Confira sua conexão e tente novamente.");
  } finally { clearTimeout(timeout); }
}

export async function authRequest<T>(path: string, body?: unknown, token?: string, method = "POST"): Promise<T> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("O acesso está indisponível. A configuração do serviço precisa ser concluída.");
  return send<T>(`${url}/auth/v1/${path}`, {
    method,
    headers: { apikey: publishableKey, "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function accessToken(): Promise<string> {
  if (!session) throw new HttpError(401, "Entre na sua conta para continuar.");
  if (session.expires_at > Date.now() + 60000) return session.access_token;
  if (!refreshPromise) {
    const refreshToken = session.refresh_token;
    refreshPromise = authRequest<{ access_token: string; refresh_token: string; expires_in: number }>(
      "token?grant_type=refresh_token", { refresh_token: refreshToken },
    ).then(async (value) => {
      if (!session || session.refresh_token !== refreshToken) throw new HttpError(401, "Entre novamente.");
      await saveSession(value);
      return value.access_token;
    }).catch(async (error) => {
      if (error instanceof HttpError && (error.status === 400 || error.status === 401)) await clearSession();
      throw error;
    }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function api<T>(path: string, options: {
  method?: string; body?: unknown; authenticated?: boolean;
} = {}): Promise<T> {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
  if (!base) throw new Error("A conexão com o InfraMap precisa ser configurada.");
  const token = options.authenticated ? await accessToken() : undefined;
  const multipart = options.body instanceof FormData;
  try {
    return await send<T>(`${base}${path}`, {
      method: options.method ?? "GET",
      headers: { Accept: "application/json", ...(!multipart ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(options.body === undefined ? {} : { body: multipart ? options.body as FormData : JSON.stringify(options.body) }),
    });
  } catch (error) {
    if (error instanceof HttpError && error.status === 401 && token === session?.access_token) await clearSession();
    throw error;
  }
}

export async function logout() {
  if (session) await authRequest("logout?scope=local", undefined, await accessToken());
  await clearSession();
}

export async function updatePassword(password: string) {
  return authRequest("user", { password }, await accessToken(), "PUT");
}
