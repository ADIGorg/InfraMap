import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http } from '@/infrastructure/api/http-client';
import {
  agencyFormSchema, agencyInputFromForm, createAgency, listAgencies, updateAgency,
} from './agencies.service';

vi.mock('@/infrastructure/api/http-client', () => ({ http: vi.fn() }));

const agency = {
  id: 'f947ca37-dd61-494f-87a7-73401b8af254',
  name: 'Secretaria de Obras',
  email: 'obras@exemplo.gov.br',
  phone: null,
  description: null,
  is_active: true,
  created_at: '2026-11-17T11:00:00Z',
  updated_at: '2026-11-17T11:00:00Z',
};

describe('Agencies service / API1-92', () => {
  beforeEach(() => vi.clearAllMocks());

  it('consulta catálogo real incluindo inativos e sem inventar registros', async () => {
    vi.mocked(http).mockResolvedValueOnce({ data: [agency, { ...agency, is_active: false }] });
    const rows = await listAgencies();
    expect(rows).toHaveLength(2);
    expect(rows[1]?.is_active).toBe(false);
    expect(http).toHaveBeenCalledWith('/admin/agencies', { signal: undefined });
  });

  it('distingue resposta vazia e resposta inválida', async () => {
    vi.mocked(http).mockResolvedValueOnce({ data: [] });
    expect(await listAgencies()).toEqual([]);
    vi.mocked(http).mockResolvedValueOnce({ data: [{ id: 'invalid' }] });
    await expect(listAgencies()).rejects.toThrow();
  });

  it('normaliza campos opcionais e valida nome, e-mail e telefone', () => {
    expect(agencyInputFromForm({
      name: ' Secretaria Municipal ', email: 'secretaria@exemplo.gov.br',
      phone: '', description: '',
    })).toEqual({
      name: 'Secretaria Municipal', email: 'secretaria@exemplo.gov.br',
      phone: null, description: null,
    });
    expect(agencyFormSchema.safeParse({
      name: '', email: 'invalido', phone: '1'.repeat(21), description: '',
    }).success).toBe(false);
  });

  it('POST e PATCH usam apenas o contrato oficial', async () => {
    vi.mocked(http).mockResolvedValueOnce({ data: agency });
    await createAgency({
      name: agency.name, email: agency.email, phone: null, description: null,
    });
    expect(http).toHaveBeenCalledWith('/admin/agencies', {
      method: 'POST',
      body: { name: agency.name, email: agency.email, phone: null, description: null },
    });
    vi.mocked(http).mockResolvedValueOnce({ data: { ...agency, is_active: false } });
    expect((await updateAgency(agency.id, { is_active: false })).is_active).toBe(false);
    expect(http).toHaveBeenCalledWith('/admin/agencies/' + agency.id, {
      method: 'PATCH', body: { is_active: false },
    });
  });
});