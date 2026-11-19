import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUser, maybeSingle, rpc } = vi.hoisted(() => ({ getUser: vi.fn(), maybeSingle: vi.fn(), rpc: vi.fn() }));
vi.mock('../../src/infrastructure/supabase/auth-client.js', () => ({ supabaseAuth: { auth: { getUser } } }));
vi.mock('../../src/infrastructure/supabase/user-client.factory.js', () => ({ createUserSupabaseClient: () => ({
  from: (table: string) => table === 'administrative_neighborhoods'
    ? { select: () => ({ eq: () => ({ order: () => ({ order: async () => ({ data: [], error: null }) }) }) }) }
    : { select: () => ({ eq: () => ({ maybeSingle }) }) }, rpc,
}) }));
import { createAdminOccurrenceQueryRoutes } from '../../src/modules/occurrences/presentation/admin-occurrence-query.routes.js';
import { errorHandler } from '../../src/shared/middlewares/error-handler.js';
const app = express();
app.use('/admin/occurrences', createAdminOccurrenceQueryRoutes());
app.use(errorHandler);
const neighborhoodId = '10000000-0000-4000-8000-000000000001';
beforeEach(() => {
  vi.resetAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: 'admin' } }, error: null });
  maybeSingle.mockResolvedValue({ data: { role: 'ADMIN', is_active: true }, error: null });
  rpc.mockResolvedValue({ data: { filters_version: 1, data: [], pagination: { page: 2147483647, limit: 100, total: 0, total_pages: 0 } }, error: null });
});
describe('API1-104 filtros administrativos', () => {
  it('não ignora silenciosamente filtro novo antes da migration', async () => {
    rpc.mockResolvedValue({ data: { data: [], pagination: { page: 1, limit: 20, total: 0, total_pages: 0 } }, error: null });
    expect((await request(app).get('/admin/occurrences?priority=HIGH').auth('jwt', { type: 'bearer' })).status).toBe(503);
  });
  it('serve catálogo vazio na rota específica, antes da rota UUID de detalhe', async () => {
    const response = await request(app).get('/admin/occurrences/neighborhoods').auth('jwt', { type: 'bearer' });
    expect(response.status).toBe(200); expect(response.body).toEqual({ data: [] });
  });
  it('encaminha filtros normalizados e página extrema à RPC', async () => {
    const response = await request(app).get('/admin/occurrences').auth('jwt', { type: 'bearer' }).query({
      q: '  Vazamento  ', priority: 'UNDEFINED', neighborhoodId, createdFrom: '2026-11-01T00:00:00-03:00',
      createdBefore: '2026-12-01T00:00:00-03:00', page: 2147483647, pageSize: 100,
      minLat: -13, maxLat: -12, minLng: -40, maxLng: -38,
    });
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('admin_list_occurrences', { p_page: 2147483647, p_limit: 100, p_filters: {
      q: 'Vazamento', priority_filter: 'UNDEFINED', neighborhoodId, sort: 'created_at', order: 'desc',
      createdFrom: '2026-11-01T00:00:00-03:00', createdBefore: '2026-12-01T00:00:00-03:00',
      bbox: { minLat: -13, maxLat: -12, minLng: -40, maxLng: -38 },
    } });
    expect(response.body.pagination.total).toBe(0);
  });
  it.each([
    { priority: 'CRITICAL' }, { priority: ['LOW', 'HIGH'] }, { q: ' ' }, { q: 'x'.repeat(201) },
    { neighborhoodId: 'invalid' }, { createdFrom: '2026-02-30' }, { createdBefore: '2026-11-01' },
    { createdFrom: '2026-11-02T00:00:00Z', createdBefore: '2026-11-01T00:00:00Z' },
    { createdFrom: '2026-11-01T00:00:00Z', createdBefore: '2026-11-01T00:00:00Z' },
    { minLat: 10 }, { minLat: 11, maxLat: 10, minLng: 0, maxLng: 1 }, { page: 2147483648 },
  ])('rejeita consulta inválida com 400: %#', async query => {
    const response = await request(app).get('/admin/occurrences').auth('jwt', { type: 'bearer' }).query(query);
    expect(response.status).toBe(400); expect(rpc).not.toHaveBeenCalled();
  });
  it.each([{ role: 'CITIZEN', is_active: true }, { role: 'ADMIN', is_active: false }])('nega %j', async user => {
    maybeSingle.mockResolvedValue({ data: user, error: null });
    expect((await request(app).get('/admin/occurrences').auth('jwt', { type: 'bearer' })).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
});
