import { selectOption } from '../../../../tests/select-option';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { transferableAbortController } from 'node:util';
import { AdminOccurrencesPage } from './admin-occurrences-page';

vi.mock('@/config/env', () => ({ env: { apiBaseUrl: 'http://localhost:3000/api/v1' } }));
vi.mock('@/infrastructure/api/supabase-client', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'test-token' } } }) } },
}));
const base = 'http://localhost:3000/api/v1';
const categoryId = '10000000-0000-4000-8000-000000000001';
const id = '20000000-0000-4000-8000-000000000001';
const item = {
  id, category: { id: categoryId, name: 'Esgoto', code: 'CAT01' },
  description: 'Vazamento', status: 'RECEIVED', priority: null,
  location: { lat: -12.26, lng: -38.96 }, createdAt: '2026-11-17T14:00:00Z',
};
const response = (data = [item], page = 1, total = 41) => ({
  data, pagination: { page, pageSize: 20, total, totalPages: Math.ceil(total / 20) },
});
const server = setupServer(
  http.get(base + '/admin/occurrences/neighborhoods', () => HttpResponse.json({ data: [] })),
  http.get(base + '/admin/me', () => HttpResponse.json({ id, role: 'ADMIN', is_active: true })),
  http.get(base + '/categories', () => HttpResponse.json({ data: [item.category] })),
  http.get(base + '/admin/occurrences', ({ request }) => HttpResponse.json(response([item], Number(new URL(request.url).searchParams.get('page'))))),
);
beforeAll(() => {
  // Node fetch requires a native signal instead of jsdom's AbortSignal.
  vi.stubGlobal('AbortController', class { constructor() { return transferableAbortController(); } });
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => server.resetHandlers());
afterAll(() => { server.close(); vi.unstubAllGlobals(); });

function Location() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output data-testid="location">{location.pathname + location.search}</output><button onClick={() => navigate(-1)}>Voltar navegador</button></>;
}
function mount(search = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/admin/occurrences' + search]}>
    <Location /><Routes><Route path="/admin/occurrences" element={<AdminOccurrencesPage />} />
      <Route path="/admin/occurrences/:id" element={<p>Detalhe da ocorrência</p>} /></Routes>
  </MemoryRouter></QueryClientProvider>);
  return client;
}
describe('Lista administrativa — API1-96', () => {
  it('aplica busca, prioridade e período no servidor, mantendo-os na URL', async () => {
    const queries: URLSearchParams[] = [];
    server.use(http.get(base + '/admin/occurrences', ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json(response());
    }));
    mount(); await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Buscar por ID, categoria ou descrição'), { target: { value: 'Vazamento' } });
    selectOption(screen.getByLabelText('Prioridade'), 'HIGH');
    fireEvent.change(screen.getByLabelText('Início do período (inclusivo)'), { target: { value: '2026-11-01T10:00' } });
    fireEvent.change(screen.getByLabelText('Fim do período (exclusivo)'), { target: { value: '2026-11-10T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar busca, prioridade e período' }));
    await waitFor(() => expect(queries.at(-1)?.get('q')).toBe('Vazamento'));
    expect(queries.at(-1)?.get('priority')).toBe('HIGH');
    expect(queries.at(-1)?.get('createdFrom')).toBe(new Date('2026-11-01T10:00').toISOString());
    expect(screen.getByTestId('location')).toHaveTextContent('priority=HIGH');
  });
  it('consulta filtros válidos, pagina no servidor e preserva filtros ao voltar no navegador', async () => {
    const queries: URLSearchParams[] = [];
    server.use(http.get(base + '/admin/occurrences', ({ request }) => {
      const params = new URL(request.url).searchParams;
      queries.push(params);
      expect(request.headers.get('authorization')).toBe('Bearer test-token');
      return HttpResponse.json(response([item], Number(params.get('page'))));
    }));
    mount();
    await screen.findByText('1–1 de 41 ocorrências');
    expect(queries[0].get('sort')).toBe('recent');
    expect(queries[0].get('pageSize')).toBe('20');
    expect(queries[0].has('priority')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    await screen.findByText('Página 2 de 3');
    expect(queries.at(-1)?.get('page')).toBe('2');
    selectOption(screen.getByLabelText('Categoria'), categoryId);
    await waitFor(() => expect(queries.at(-1)?.get('categoryId')).toBe(categoryId));
    expect(queries.at(-1)?.get('page')).toBe('1');
    fireEvent.click(screen.getByLabelText('Resolvido'));
    await waitFor(() => expect(queries.at(-1)?.get('status')).toBe('RESOLVED'));
    selectOption(screen.getByLabelText('Ordenação'), 'most_liked');
    await waitFor(() => expect(queries.at(-1)?.get('sort')).toBe('most_liked'));
    fireEvent.click(screen.getByRole('button', { name: 'Voltar navegador' }));
    await waitFor(() => expect(screen.getByLabelText('Ordenação')).toHaveTextContent('Mais recentes'));
  });

  it('consulta status CSV e região de deep link e abre detalhe pelo UUID completo', async () => {
    server.use(http.get(base + '/admin/occurrences', ({ request }) => {
      const params = new URL(request.url).searchParams;
      expect(params.get('status')).toBe('RESOLVED,REJECTED');
      expect(params.get('minLat')).toBe('-13');
      expect(params.get('maxLng')).toBe('-38');
      return HttpResponse.json(response([{ ...item, status: 'RESOLVED' }, { ...item, id: '30000000-0000-4000-8000-000000000001', status: 'REJECTED' }], 1, 2));
    }));
    mount('?status=RESOLVED,REJECTED&minLat=-13&maxLat=-12&minLng=-39&maxLng=-38');
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: /Iniciar análise/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
    fireEvent.click(screen.getAllByRole('link', { name: 'Ver detalhes' })[0]);
    await screen.findByText('Detalhe da ocorrência');
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/occurrences/' + id);
  });

  it('exige confirmação e trata 409 atualizando o status, sem repetir a mutation', async () => {
    let changed = false;
    let mutations = 0;
    server.use(
      http.get(base + '/admin/occurrences', () => HttpResponse.json(response([{ ...item, status: changed ? 'UNDER_ANALYSIS' : 'RECEIVED' }]))),
      http.patch(base + '/admin/occurrences/' + id + '/start-analysis', () => {
        mutations++;
        changed = true;
        return HttpResponse.json({ error: { code: 'CONFLICT', message: 'Status alterado' } }, { status: 409 });
      }),
    );
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /Iniciar análise da ocorrência/ }));
    expect(mutations).toBe(0);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('alert')).toHaveTextContent('alterada por outro administrador');
    await screen.findByRole('link', { name: 'Analisar' });
    expect(mutations).toBe(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Análise iniciada com sucesso.')).not.toBeInTheDocument();
  });

  it('confirma análise com PATCH e atualiza a lista no sucesso', async () => {
    let changed = false;
    server.use(
      http.get(base + '/admin/occurrences', () => HttpResponse.json(response([{ ...item, status: changed ? 'UNDER_ANALYSIS' : 'RECEIVED' }]))),
      http.patch(base + '/admin/occurrences/' + id + '/start-analysis', () => {
        changed = true;
        return HttpResponse.json({ message: 'Análise iniciada' });
      }),
    );
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /Iniciar análise da ocorrência/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await screen.findByText('Análise iniciada com sucesso.');
    await screen.findByRole('link', { name: 'Analisar' });
  });

  it('mostra erro recuperável e depois estado vazio', async () => {
    server.use(http.get(base + '/admin/occurrences', () => HttpResponse.json({}, { status: 500 })));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('serviço está indisponível');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    server.use(http.get(base + '/admin/occurrences', () => HttpResponse.json(response([], 1, 0))));
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByText('Nenhuma ocorrência encontrada para os filtros selecionados.');
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
  });

  it('recusa filtros inválidos sem enviar consulta e permite limpar a URL', async () => {
    let requests = 0;
    server.use(http.get(base + '/admin/occurrences', () => { requests++; return HttpResponse.json(response()); }));
    mount('?sort=created_at&minLat=-12');
    expect(screen.getByRole('alert')).toHaveTextContent('filtros da URL são inválidos');
    expect(requests).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    await screen.findByRole('table');
    expect(requests).toBe(1);
  });

  it('valida o DTO e não renderiza status desconhecido', async () => {
    server.use(http.get(base + '/admin/occurrences', () => HttpResponse.json(response([{ ...item, status: 'UNKNOWN' }]))));
    mount();
    await screen.findByRole('alert');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('corrige uma página fora do total retornado pelo servidor', async () => {
    server.use(http.get(base + '/admin/occurrences', ({ request }) => {
      const page = Number(new URL(request.url).searchParams.get('page'));
      return HttpResponse.json(response(page === 1 ? [item] : [], page, 1));
    }));
    mount('?page=8');
    await screen.findByText('1–1 de 1 ocorrências');
    expect(screen.getByTestId('location')).toHaveTextContent('page=1&');
  });

  it('valida região completa antes de aplicar e preserva os limites na URL', async () => {
    const queries: URLSearchParams[] = [];
    server.use(http.get(base + '/admin/occurrences', ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json(response());
    }));
    mount();
    await screen.findByRole('table');
    fireEvent.click(screen.getByText('Filtrar por região'));
    fireEvent.change(screen.getByLabelText('Latitude mínima'), { target: { value: '-13' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar região' }));
    expect(screen.getByRole('alert')).toHaveTextContent('quatro limites');
    expect(queries).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Latitude máxima'), { target: { value: '-12' } });
    fireEvent.change(screen.getByLabelText('Longitude mínima'), { target: { value: '-39' } });
    fireEvent.change(screen.getByLabelText('Longitude máxima'), { target: { value: '-38' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar região' }));
    await waitFor(() => expect(queries.at(-1)?.get('minLat')).toBe('-13'));
    expect(queries.at(-1)?.get('maxLng')).toBe('-38');
    expect(screen.getByTestId('location')).toHaveTextContent('minLat=-13');
  });

  it('não consulta ocorrências nem permite ações para identidade inativa', async () => {
    let requests = 0;
    server.use(
      http.get(base + '/admin/me', () => HttpResponse.json({ id, role: 'ADMIN', is_active: false })),
      http.get(base + '/admin/occurrences', () => { requests++; return HttpResponse.json(response()); }),
    );
    const client = mount();
    await waitFor(() => expect(client.getQueryState(['admin', 'me'])?.status).toBe('success'));
    expect(screen.getByLabelText('Categoria')).toBeDisabled();
    expect(requests).toBe(0);
    expect(screen.queryByRole('button', { name: /Iniciar análise/ })).not.toBeInTheDocument();
  });
});

