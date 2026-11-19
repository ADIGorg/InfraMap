import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '@/infrastructure/api/http-client';
import {
  ACTIVE_STATUSES, DEFAULT_FILTERS,
  adminOccurrencesSchema, createAdminMapQuery,
  listActiveAdminOccurrences, adjustAdminOccurrenceLocation, validateBounds,
} from './admin-occurrences.service';

vi.mock('@/infrastructure/api/http-client', () => ({ http: vi.fn() }));

const item = {
  id: '916e5e03-87bc-4eae-8474-a48956d9eaaa',
  status: 'RECEIVED',
  category: { id: '352e55c2-9943-4215-a185-4f100966138e', code: 'CAT01', name: 'Vazamento' },
  description: 'Problema na via pública',
  location: { lat: -12.99, lng: -38.5 },
  priority: null,
  createdAt: '2026-11-17T12:00:00Z',
};

describe('AdminMapService', () => {
  beforeEach(() => { vi.mocked(http).mockReset(); });

  it('envia lista completa de status ativos, categoria UUID e quartetos bbox', () => {
    const query = createAdminMapQuery({
      statuses: [...ACTIVE_STATUSES],
      categoryId: '352e55c2-9943-4215-a185-4f100966138e',
      bbox: { minLat: -13, maxLat: -12, minLng: -39, maxLng: -38 },
    }, 2);
    const params = new URLSearchParams(query.split('?')[1]);
    expect(params.get('page')).toBe('2');
    expect(params.get('pageSize')).toBe('100');
    expect(params.get('status')).toBe('RECEIVED,UNDER_ANALYSIS,CONFIRMED,IN_SERVICE');
    expect(params.get('categoryId')).toBe('352e55c2-9943-4215-a185-4f100966138e');
    expect(params.get('minLat')).toBe('-13');
    expect(params.get('maxLat')).toBe('-12');
    expect(params.get('minLng')).toBe('-39');
    expect(params.get('maxLng')).toBe('-38');
    expect(params.has('bairro')).toBe(false);
    expect(params.has('createdAfter')).toBe(false);
  });

  it('não envia bbox parcial ou invertida ao backend (evita 400)', () => {
    expect(() => validateBounds({ minLat: 5, maxLat: 2, minLng: -40, maxLng: -30 })).toThrow();
    expect(() => validateBounds({ minLat: 1, maxLat: 3, minLng: 30, maxLng: -40 })).toThrow();
    expect(() => validateBounds({ minLat: NaN, maxLat: 3, minLng: -40, maxLng: -30 })).toThrow();
  });

  it('pagina até o fim e elimina registros terminais dos pins', async () => {
    vi.mocked(http).mockResolvedValueOnce({
      data: [item, { ...item, id: '916e5e03-87bc-4eae-8474-a48956d9eabb', status: 'RESOLVED' }],
      pagination: { page: 1, pageSize: 100, total: 3, totalPages: 2 },
    }).mockResolvedValueOnce({
      data: [{ ...item, id: '916e5e03-87bc-4eae-8474-a48956d9eacc', status: 'IN_SERVICE' }],
      pagination: { page: 2, pageSize: 100, total: 3, totalPages: 2 },
    });
    const rows = await listActiveAdminOccurrences(DEFAULT_FILTERS);
    expect(rows).toHaveLength(2);
    expect(rows.map(x => x.status)).toEqual(['RECEIVED', 'IN_SERVICE']);
    expect(http).toHaveBeenCalledTimes(2);
  });

  it('não busca se nenhum status ativo estiver selecionado', async () => {
    expect(await listActiveAdminOccurrences({ ...DEFAULT_FILTERS, statuses: [] })).toEqual([]);
    expect(http).not.toHaveBeenCalled();
  });

  it('invalida categoria/ponto ausentes e não inventa localização', () => {
    expect(adminOccurrencesSchema.safeParse({
      data: [{ ...item, location: null }],
      pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    }).success).toBe(false);
  });

  it('manda PATCH somente com lat/lng; nunca sobrescreve original', async () => {
    vi.mocked(http).mockResolvedValue(undefined);
    await adjustAdminOccurrenceLocation(item.id, { lat: -12.98, lng: -38.52 });
    expect(http).toHaveBeenCalledWith(
      '/admin/occurrences/' + item.id + '/location',
      { method: 'PATCH', body: { lat: -12.98, lng: -38.52 } },
    );
  });

  it('propaga erro 403 e 409 sem simular sucesso na mutation', async () => {
    vi.mocked(http).mockRejectedValueOnce(new Error('403')).mockRejectedValueOnce(new Error('409'));
    await expect(adjustAdminOccurrenceLocation(item.id, { lat: -12.98, lng: -38.52 })).rejects.toThrow('403');
    await expect(adjustAdminOccurrenceLocation(item.id, { lat: -12.98, lng: -38.52 })).rejects.toThrow('409');
  });
});
