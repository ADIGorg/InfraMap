import { describe, expect, it, vi } from 'vitest';
vi.mock('@/infrastructure/api/http-client', () => ({ http: vi.fn() }));
import { parseFilters, serializeFilters } from './admin-occurrences.service';
import { createAdminMapQuery } from '@/features/admin-map/services/admin-occurrences.service';

describe('Filtros globais na URL', () => {
  const params = new URLSearchParams({ priority: 'HIGH', q: 'Esgoto %', createdFrom: '2026-11-01T00:00:00-03:00', createdBefore: '2026-12-01T00:00:00-03:00', neighborhoodId: '10000000-0000-4000-8000-000000000001' });
  it('preserva todos os filtros entre parse e serialização da lista', () => {
    const parsed = parseFilters(params);
    expect(parsed.success).toBe(true);
    if (parsed.success) for (const [key, value] of params) expect(serializeFilters(parsed.data).get(key)).toBe(value);
  });
  it('envia os mesmos critérios globais para todas as páginas do mapa', () => {
    const extra = Object.fromEntries(params);
    for (const page of [1, 2]) {
      const query = new URLSearchParams(createAdminMapQuery({ statuses: ['RECEIVED'], categoryId: '', bbox: null, ...extra }, page).split('?')[1]);
      for (const [key, value] of params) expect(query.get(key)).toBe(value);
      expect(query.get('page')).toBe(String(page));
    }
  });
  it('recusa período invertido e paginação além do integer PostgreSQL', () => {
    expect(parseFilters(new URLSearchParams({ createdFrom: '2026-12-01T00:00:00Z', createdBefore: '2026-11-01T00:00:00Z' })).success).toBe(false);
    expect(parseFilters(new URLSearchParams({ page: '2147483648' })).success).toBe(false);
  });
});
