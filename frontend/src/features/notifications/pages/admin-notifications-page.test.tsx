import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http } from '@/infrastructure/api/http-client';
import { AdminNotificationsPage } from './admin-notifications-page';

vi.mock('@/infrastructure/api/http-client', () => ({ http: vi.fn() }));
vi.mock('@/features/auth/hooks/use-admin-identity', () => ({
  useAdminIdentity: () => ({ isSuccess: true, data: { id: 'admin-1', role: 'ADMIN', is_active: true } }),
}));
const item = {
  id: '20000000-0000-4000-8000-000000000001',
  category: { id: 'cat-1', code: 'CAT01', name: 'Esgoto' },
  description: 'Vazamento', status: 'RECEIVED', priority: null, votesCount: 0,
  location: { lat: -12, lng: -38 }, createdAt: '2026-11-18T14:00:00Z',
};
const dashboard = { data: {
  counts_by_status: { RECEIVED: 2, UNDER_ANALYSIS: 0, CONFIRMED: 0, IN_SERVICE: 0, RESOLVED: 0, REJECTED: 0 },
  high_priority_total: 0, average_resolution_days: null,
  sla_breaches: { received_over_48h: 2, under_analysis_over_5d: 0 },
} };
const clients: QueryClient[] = [];
function mount(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  clients.push(client);
  return { client, ...render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/admin/notifications']}>
    <Routes><Route path="/admin/notifications" element={<AdminNotificationsPage />} />
      <Route path="/admin/occurrences/:id" element={<p>Detalhe correto</p>} />
    </Routes>
  </MemoryRouter></QueryClientProvider>) };
}
beforeEach(() => {
  onlineManager.setOnline(true);
  vi.mocked(http).mockReset();
  vi.mocked(http).mockImplementation(async path => {
    if (path === '/admin/dashboard') return dashboard;
    if (path.startsWith('/admin/occurrences?')) return {
      data: [item, item], pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
    };
    throw new Error('Endpoint não permitido: ' + path);
  });
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.clear());
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Notificações administrativas derivadas', () => {
  it('deduplica, exibe data real e SLA, e usa somente consultas disponíveis', async () => {
    mount();
    expect(await screen.findByText(/Ocorrência #OC-2000 registrada/)).toBeInTheDocument();
    expect(screen.getAllByText(/Ocorrência #OC-2000 registrada/)).toHaveLength(1);
    expect(screen.getByText('18/11/2026, 11:00')).toBeInTheDocument();
    expect(screen.getByText('2 ocorrências recebidas há mais de 48 horas')).toBeInTheDocument();
    expect(screen.queryByText(/Cidadão respondeu|Rejeição requer revisão/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ocorrência #OC-2000/ })).toHaveAttribute('href', '/admin/occurrences/' + item.id);
    expect(vi.mocked(http).mock.calls.every(([path, options]) =>
      (path === '/admin/dashboard' || path.startsWith('/admin/occurrences?')) && !options?.method,
    )).toBe(true);
  });

  it('marca apenas localmente e mantém a visualização ao voltar na mesma sessão', async () => {
    const first = mount();
    await screen.findByText(/Ocorrência #OC-2000 registrada/);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar alertas exibidos como visualizados' }));
    await waitFor(() => expect(screen.getAllByText('Visualizada nesta sessão')).toHaveLength(2));
    expect(http).toHaveBeenCalledTimes(2);
    first.unmount();
    mount(first.client);
    expect(screen.getAllByText('Visualizada nesta sessão')).toHaveLength(2);
  });

  it('abre o detalhe ao clicar na ocorrência', async () => {
    mount();
    fireEvent.click(await screen.findByRole('link', { name: /Ocorrência #OC-2000/ }));
    expect(await screen.findByText('Detalhe correto')).toBeInTheDocument();
  });

  it('faz polling em 30 segundos sem duplicar e para ao desmontar', async () => {
    vi.useFakeTimers();
    const view = mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(http).toHaveBeenCalledTimes(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(http).toHaveBeenCalledTimes(4);
    expect(screen.getAllByText(/Ocorrência #OC-2000 registrada/)).toHaveLength(1);
    view.unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(http).toHaveBeenCalledTimes(4);
  });

  it('sinaliza offline, preserva dados e pausa novas consultas', async () => {
    mount();
    await screen.findByText(/Ocorrência #OC-2000 registrada/);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(screen.getByRole('alert')).toHaveTextContent('Sem conexão');
    expect(screen.getByText(/Ocorrência #OC-2000 registrada/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Atualizar alertas' })).toBeDisabled();
  });

  it('não apresenta falha parcial como lista vazia e permite tentar novamente', async () => {
    vi.mocked(http).mockRejectedValueOnce(new Error('Falha'));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível atualizar as ocorrências');
    expect(screen.queryByText('Nenhum alerta disponível.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar alertas' }));
    expect(await screen.findByText(/Ocorrência #OC-2000 registrada/)).toBeInTheDocument();
  });

  it('mostra vazio somente após ambas as fontes responderem sem alertas', async () => {
    vi.mocked(http).mockImplementation(async path => path === '/admin/dashboard'
      ? { data: { ...dashboard.data, sla_breaches: { received_over_48h: 0, under_analysis_over_5d: 0 } } }
      : { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } });
    mount();
    expect(await screen.findByText('Nenhum alerta disponível.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });

  it('consulta a próxima página no servidor e mantém SLA sem duplicação', async () => {
    vi.mocked(http).mockImplementation(async path => {
      if (path === '/admin/dashboard') return dashboard;
      const page = Number(new URL(path, 'http://localhost').searchParams.get('page'));
      return { data: [{ ...item, category: { ...item.category, name: 'Categoria página ' + page } }],
        pagination: { page, pageSize: 20, total: 21, totalPages: 2 } };
    });
    mount();
    await screen.findByText(/Categoria página 1/);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    expect(await screen.findByText(/Categoria página 2/)).toBeInTheDocument();
    expect(screen.getAllByText('2 ocorrências recebidas há mais de 48 horas')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });

  it('uma mudança na contagem de SLA volta a destacar o alerta', async () => {
    mount();
    await screen.findByText(/Ocorrência #OC-2000 registrada/);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar alertas exibidos como visualizados' }));
    await waitFor(() => expect(screen.getAllByText('Visualizada nesta sessão')).toHaveLength(2));
    vi.mocked(http).mockImplementation(async path => path === '/admin/dashboard'
      ? { data: { ...dashboard.data, sla_breaches: { received_over_48h: 3, under_analysis_over_5d: 0 } } }
      : { data: [item], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } });
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar alertas' }));
    await screen.findByText('3 ocorrências recebidas há mais de 48 horas');
    expect(screen.getAllByText('Não visualizada nesta sessão')).toHaveLength(1);
    expect(screen.getAllByText('Visualizada nesta sessão')).toHaveLength(1);
  });
});
