import { supabase } from '@/infrastructure/api/supabase-client';
import { env } from '@/config/env';
import { AppError } from '@/shared/errors/app-error';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
interface HttpOptions {
  method?: Method;
  body?: unknown;
  signal?: AbortSignal;
  auth?: boolean;
}

type ServerFailure = { error?: { code?: unknown; message?: unknown } };
let pendingRefresh: Promise<string | null> | null = null;

async function renewSessionOnce(): Promise<string | null> {
  if (!pendingRefresh) {
    pendingRefresh = supabase.auth.refreshSession()
      .then(({ data, error }) => (error ? null : data.session?.access_token ?? null))
      .catch(() => null)
      .finally(() => { pendingRefresh = null; });
  }
  return pendingRefresh;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = payload as ServerFailure | null;
    const code = typeof failure?.error?.code === 'string'
      ? failure.error.code : 'HTTP_ERROR';
    const message = typeof failure?.error?.message === 'string'
      ? failure.error.message : 'Não foi possível completar a operação.';
    throw new AppError(response.status, code, message);
  }
  if (payload === null) throw new AppError(502, 'INVALID_RESPONSE', 'Resposta inválida do servidor.');
  return payload as T;
}

// Devolve corpo HTTP original: /admin/me é objeto direto, não { data }.
export async function http<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, auth = true } = options;
  const url = env.apiBaseUrl + (path.startsWith('/') ? path : '/' + path);
  const session = auth ? await supabase.auth.getSession() : null;
  const accessToken = session?.data.session?.access_token ?? null;
  if (auth && !accessToken) throw new AppError(401, 'UNAUTHORIZED', 'Autenticação necessária.');

  const send = (token: string | null) => fetch(url, {
    method,
    signal,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  let response: Response;
  try {
    response = await send(accessToken);
    // Somente GET: mutations nunca são repetidas automaticamente.
    if (auth && response.status === 401 && method === 'GET') {
      const refreshed = await renewSessionOnce();
      if (refreshed) response = await send(refreshed);
      else await supabase.auth.signOut();
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(0, 'NETWORK_ERROR', 'Sem conexão com a API. Verifique a rede.');
  }
  return parseResponse<T>(response);
}
