import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
vi.mock('@/infrastructure/api/http-client', () => ({ http: vi.fn() }));
vi.mock('../services/admin-occurrences.service', async importOriginal => ({
  ...await importOriginal<typeof import('../services/admin-occurrences.service')>(),
  listActiveAdminOccurrences: vi.fn(async () => []), listMapCategories: vi.fn(async () => []),
}));
import { listActiveAdminOccurrences } from '../services/admin-occurrences.service';
import { useAdminMapViewModel } from './use-admin-map-view-model';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('Filtros do mapa na URL', () => {
  function mount(path: string) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}>{children}</MemoryRouter></QueryClientProvider>;
    return { client, ...renderHook(() => ({ vm: useAdminMapViewModel(), navigate: useNavigate() }), { wrapper }) };
  }
  it('restaura critérios do link, aplica no servidor e preserva voltar do navegador', async () => {
    const { result, unmount, client } = mount('/admin/map?priority=HIGH&q=esgoto');
    await waitFor(() => expect(result.current.vm.occurrences.isSuccess).toBe(true));
    expect(result.current.vm.applied).toMatchObject({ priority: 'HIGH', q: 'esgoto' });
    act(() => result.current.vm.setExtraFilters({ priority: 'LOW', q: 'água' }));
    await waitFor(() => expect(result.current.vm.applied.priority).toBe('LOW'));
    expect(listActiveAdminOccurrences).toHaveBeenLastCalledWith(expect.objectContaining({ priority: 'LOW', q: 'água' }), expect.anything());
    act(() => result.current.navigate(-1));
    await waitFor(() => expect(result.current.vm.applied.priority).toBe('HIGH'));
    unmount(); client.clear();
  });
  it('não consulta dados com período inválido na URL', () => {
    const { result, unmount, client } = mount('/admin/map?createdFrom=invalido');
    expect(result.current.vm.inputError).toMatch(/inválidos/);
    expect(listActiveAdminOccurrences).not.toHaveBeenCalled();
    unmount(); client.clear();
  });
});
