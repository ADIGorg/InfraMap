import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { supabase } from './supabase-client';
import { http } from './http-client';
import { AppError } from '@/shared/errors/app-error';

vi.mock('@/config/env', () => ({
  env: { apiBaseUrl: 'http://localhost:3000/api/v1' },
}));
vi.mock('./supabase-client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      refreshSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { access_token: 'original-token' } }, error: null,
  } as Awaited<ReturnType<typeof supabase.auth.getSession>>);
  vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
    data: { session: { access_token: 'renewed-token' } }, error: null,
  } as Awaited<ReturnType<typeof supabase.auth.refreshSession>>);
  vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as Awaited<ReturnType<typeof supabase.auth.signOut>>);
});

describe('http client', () => {
  it('envia Bearer e preserva contrato direto de /admin/me', async () => {
    server.use(mswHttp.get('http://localhost:3000/api/v1/admin/me', ({ request }) => {
      expect(request.headers.get('authorization')).toBe('Bearer original-token');
      return HttpResponse.json({ role: 'ADMIN', is_active: true });
    }));
    expect(await http<{ role: string }>('/admin/me')).toEqual({ role: 'ADMIN', is_active: true });
  });

  it('renova uma vez após 401 em GET e refaz consulta', async () => {
    let attempts = 0;
    server.use(mswHttp.get('http://localhost:3000/api/v1/admin/dashboard', ({ request }) => {
      attempts++;
      if (request.headers.get('authorization') === 'Bearer original-token') {
        return HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Expirou' } }, { status: 401 });
      }
      expect(request.headers.get('authorization')).toBe('Bearer renewed-token');
      return HttpResponse.json({ data: { counts_by_status: {} } });
    }));
    await http('/admin/dashboard');
    expect(attempts).toBe(2);
    expect(supabase.auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('nunca repete mutation após 401', async () => {
    server.use(mswHttp.post('http://localhost:3000/api/v1/admin/occurrences/1/confirm', () => {
      return HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Expirou' } }, { status: 401 });
    }));
    await expect(http('/admin/occurrences/1/confirm', { method: 'POST', body: {} })).rejects.toBeInstanceOf(AppError);
    expect(supabase.auth.refreshSession).not.toHaveBeenCalled();
  });

  it('403 não provoca refresh e mantém autorização no servidor', async () => {
    server.use(mswHttp.get('http://localhost:3000/api/v1/admin/admins', () => {
      return HttpResponse.json({ error: { code: 'FORBIDDEN', message: 'Acesso negado' } }, { status: 403 });
    }));
    await expect(http('/admin/admins')).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    expect(supabase.auth.refreshSession).not.toHaveBeenCalled();
  });
});
