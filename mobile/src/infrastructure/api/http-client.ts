import { AppError, parseErrorResponse } from '@/shared/errors/app-error';
import { getAccessToken, refreshSession } from './supabase-auth';
import { env } from '@/config/env';

interface RequestOptions extends RequestInit {
  auth?: boolean;
  noRetry?: boolean;
  raw?: boolean;
}

export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, noRetry = false, raw = false, headers: customHeaders, ...rest } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (auth) {
    const token = await getAccessToken();
    if (!token) throw new AppError(401, 'UNAUTHORIZED', 'Sessão expirada.');
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000); // 30s timeout

  try {
    const response = await fetch(`${env.apiBaseUrl}${path}`, {
      ...rest,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 401 && auth && !noRetry) {
      const refreshed = await refreshSession();
      if (refreshed) return http<T>(path, { ...options, noRetry: true });
      throw new AppError(401, 'UNAUTHORIZED', 'Sessão expirada. Faça login novamente.');
    }

    if (response.status === 204) return undefined as T;

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AppError(response.status, 'INVALID_JSON', 'Resposta inválida do servidor.');
    }

    if (!response.ok) throw parseErrorResponse(response.status, payload);

    if (!raw && typeof payload === 'object' && payload !== null && 'data' in payload) {
      return (payload as { data: T }).data;
    }

    return payload as T;

  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof AppError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(408, 'TIMEOUT', 'A requisição demorou muito. Tente novamente.');
    }
    throw new AppError(500, 'NETWORK_ERROR', 'Erro de conexão. Verifique sua internet.');
  }
}

export async function httpMultipart<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const token = await getAccessToken();

  if (!token) {
    throw new AppError(
      401,
      'UNAUTHORIZED',
      'Sessão expirada.',
    );
  }

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 60_000);

  try {
    console.log(
      '[httpMultipart] Iniciando upload:',
      `${env.apiBaseUrl}${path}`,
    );

    const response = await fetch(
      `${env.apiBaseUrl}${path}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        signal: controller.signal,
      },
    );

    const responseText = await response.text();

    console.log(
      '[httpMultipart] Resposta:',
      {
        status: response.status,
        ok: response.ok,
        body: responseText,
      },
    );

    let payload: unknown;

    try {
      payload = responseText
        ? JSON.parse(responseText)
        : null;
    } catch {
      throw new AppError(
        response.status,
        'INVALID_JSON',
        'Resposta inválida do servidor.',
      );
    }

    if (!response.ok) {
      throw parseErrorResponse(
        response.status,
        payload,
      );
    }

    if (
      typeof payload === 'object' &&
      payload !== null &&
      'data' in payload
    ) {
      return (payload as { data: T }).data;
    }

    return payload as T;
  } catch (error) {
    if (error instanceof AppError) {
      console.error(
        '[httpMultipart] AppError:',
        {
          statusCode: error.statusCode,
          code: error.code,
          message: error.message,
        },
      );

      throw error;
    }

    if (
      error instanceof Error &&
      error.name === 'AbortError'
    ) {
      console.error(
        '[httpMultipart] Timeout após 60 segundos',
      );

      throw new AppError(
        408,
        'UPLOAD_TIMEOUT',
        'O envio das fotos demorou muito. Tente novamente.',
      );
    }

    console.error(
      '[httpMultipart] Erro inesperado:',
      error,
    );

    throw new AppError(
      500,
      'UPLOAD_NETWORK_ERROR',
      'Não foi possível enviar as fotos. Verifique sua conexão.',
    );
  } finally {
    clearTimeout(timeoutId);
  }
}