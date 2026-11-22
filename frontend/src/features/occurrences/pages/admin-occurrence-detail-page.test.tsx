import { selectOption } from '../../../../tests/select-option';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { transferableAbortController } from 'node:util';
import { AdminOccurrenceDetailPage } from './admin-occurrence-detail-page';
import type { OccurrenceDetail } from '../services/occurrence-detail.service';

vi.mock('@/features/admin-map/components/admin-leaflet-map', () => ({ AdjustmentLeafletMap: () => <div data-testid="map-mock" /> }));
vi.mock('@/shared/components/occurrence-address', () => ({ OccurrenceAddress: () => <span>Endereço de teste</span> }));
vi.mock('@/config/env', () => ({ env: { apiBaseUrl: 'http://localhost:3000/api/v1' } }));
vi.mock('@/infrastructure/api/supabase-client', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'test' } } }) } },
}));
const base = 'http://localhost:3000/api/v1';
const id = '20000000-0000-4000-8000-000000000001';
const agencyId = '30000000-0000-4000-8000-000000000001';
const alternativeCategoryId = '30000000-0000-4000-8000-000000000002';
const fixture: OccurrenceDetail = {
  id, category: { id: agencyId, name: 'Esgoto', code: 'CAT01' }, description: 'Vazamento de esgoto',
  status: 'RECEIVED', priority: null, location: { lat: -12, lng: -38 },
  votesCount: 12,
  createdAt: '2026-11-18T14:00:00Z', author: { id, name: 'Maria Silva' },
  locationOriginal: { lat: -12, lng: -38 }, locationAdjusted: null,
  categorySource: 'AI_CONFIRMED', descriptionSource: 'AI_EDITED',
  photoUrls: [{ position: 0, url: 'https://example.com/signed-photo', expiresAt: '2099-01-01T00:00:00Z' }],
};
let item: OccurrenceDetail;
let calls: Array<{ method: string; action: string; body: Record<string, unknown> }>;
let forwards = 0;
let forwardingStatus = 'SENT';
let conflict = false;
let reads = 0;
const forwarding = () => ({
  id: agencyId, agencyId, status: forwardingStatus, recipientEmail: 'orgao@example.com',
  createdAt: '2026-11-18T14:00:00Z', observations: null, agencyName: 'Órgão de teste',
});
const server = setupServer(
  http.get(base + '/admin/me', () => HttpResponse.json({ id, role: 'ADMIN', is_active: true })),
  http.get(base + '/admin/occurrences/' + id, () => { reads++; return HttpResponse.json({ data: item }); }),
  http.get(base + '/categories', () => HttpResponse.json({ data: [fixture.category, { id: alternativeCategoryId, name: 'Saneamento e Drenagem', code: 'CAT02' }] })),
  http.get(base + '/admin/agencies', () => HttpResponse.json({ data: [{ id: agencyId, name: 'Órgão de teste', email: 'orgao@example.com', is_active: true }] })),
  http.get(base + '/admin/occurrences/' + id + '/forwardings', () => HttpResponse.json({ data: [forwarding()] })),
  http.get(base + '/occurrences/' + id + '/history', () => HttpResponse.json({ data: [{
    id: 'history1', type: 'observation', action: 'OBSERVATION_CREATED', actorId: id,
    createdAt: '2026-11-18T14:00:00Z', content: 'Nota interna registrada', visibility: 'INTERNAL', details: null,
  }] })),
  http.post(base + '/admin/occurrences/' + id + '/forwardings', () => {
    forwards++;
    return HttpResponse.json({ data: forwarding() }, { status: 201 });
  }),
  http.all(base + '/admin/occurrences/' + id + '/:action', async ({ request, params }) => {
    if (!['PATCH', 'POST'].includes(request.method)) return HttpResponse.json({}, { status: 404 });
    calls.push({ method: request.method, action: String(params.action), body: await request.json() as Record<string, unknown> });
    if (conflict) { item.status = 'RESOLVED'; return HttpResponse.json({ error: { code: 'CONFLICT', message: 'Conflito' } }, { status: 409 }); }
    if (params.action === 'resolve') item.status = 'RESOLVED';
    return HttpResponse.json({ message: 'Registrado' });
  }),
);
beforeAll(() => {
  vi.stubGlobal('AbortController', class { constructor() { return transferableAbortController(); } });
  server.listen({ onUnhandledRequest: 'error' });
});
beforeEach(() => { item = structuredClone(fixture); calls = []; forwards = 0; forwardingStatus = 'SENT'; conflict = false; reads = 0; });
afterEach(() => server.resetHandlers());
afterAll(() => { server.close(); vi.unstubAllGlobals(); });
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/admin/occurrences/' + id]}>
    <Routes><Route path="/admin/occurrences/:id" element={<AdminOccurrenceDetailPage />} /></Routes>
  </MemoryRouter></QueryClientProvider>);
}
async function openAction(label: string) {
  const button = await screen.findByRole('button', { name: label });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  return within(screen.getByRole('dialog'));
}
describe('Detalhe administrativo API1-97', () => {
  it.each([[0, '0 curtidas'], [1, '1 curtida'], [1234, '1.234 curtidas']])('exibe %s curtidas no resumo', async (votesCount, label) => {
    item.votesCount = Number(votesCount);
    mount();
    expect(await screen.findByText(String(label))).toBeInTheDocument();
  });
  it.each([
    ['RECEIVED', 'Iniciar análise', 'start-analysis', 'PATCH', null, null],
    ['UNDER_ANALYSIS', 'Confirmar ocorrência', 'confirm', 'POST', null, null],
    ['CONFIRMED', 'Iniciar atendimento', 'start-service', 'POST', 'Ação concreta do atendimento', 'Equipe enviada ao local'],
    ['CONFIRMED', 'Definir prioridade', 'priority', 'PATCH', null, null],
    ['UNDER_ANALYSIS', 'Ajustar localização', 'location', 'PATCH', 'Latitude', '-13'],
    ['UNDER_ANALYSIS', 'Corrigir classificação', 'classification', 'PATCH', 'Descrição corrigida', 'Descrição corrigida do vazamento'],
  ] as const)('executa %s / %s com confirmação e contrato correto', async (status, label, action, method, field, value) => {
    item.status = status;
    item.priority = 'HIGH';
    mount();
    const dialog = await openAction(label);
    expect(calls).toHaveLength(0);
    if (field) fireEvent.change(dialog.getByLabelText(field), { target: { value } });
    if (action === 'start-service') fireEvent.click(dialog.getByRole('checkbox'));
    fireEvent.click(dialog.getByRole('button', { name: action === 'location' ? 'Salvar posição' : 'Confirmar' }));
    if (action === 'location') fireEvent.click(dialog.getByRole('button', { name: 'Confirmar ajuste' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({ action, method });
    if (action === 'location') expect(calls[0].body).toEqual({ lat: -13, lng: -38 });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(reads).toBeGreaterThan(1);
  });

  it('corrige a categoria selecionada enviando categoryId para a API', async () => {
    item.status = 'UNDER_ANALYSIS';
    mount();
    const dialog = await openAction('Corrigir classificação');
    selectOption(dialog.getByLabelText('Categoria'), alternativeCategoryId);
    fireEvent.click(dialog.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({
      action: 'classification', method: 'PATCH', body: { categoryId: alternativeCategoryId },
    });
  });

  it('conclui manualmente o atendimento somente após revisar a resolução', async () => {
    item.status = 'IN_SERVICE';
    item.priority = 'HIGH';
    mount();
    const dialog = await openAction('Marcar como resolvida');
    const notes = 'Serviço executado pela equipe e problema solucionado.';
    fireEvent.change(dialog.getByLabelText('Notas de resolução'), { target: { value: notes } });
    fireEvent.click(dialog.getByRole('button', { name: 'Revisar resolução' }));
    expect(calls).toHaveLength(0);
    expect(dialog.getByText(notes)).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Voltar' }));
    expect(dialog.getByLabelText('Notas de resolução')).toHaveValue(notes);
    fireEvent.click(dialog.getByRole('button', { name: 'Revisar resolução' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Confirmar resolução' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({
      action: 'resolve', method: 'POST', body: { resolutionNotes: notes },
    });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Marcar como resolvida' })).not.toBeInTheDocument());
    expect(screen.getByText('Esta ocorrência foi resolvida. A conclusão está registrada no histórico.')).toBeInTheDocument();
  });

  it('não permite concluir manualmente uma ocorrência que não iniciou atendimento', async () => {
    item.status = 'CONFIRMED';
    item.priority = 'HIGH';
    mount();
    await screen.findByRole('heading', { name: /Detalhes da ocorrência/ });
    expect(screen.queryByRole('button', { name: 'Marcar como resolvida' })).not.toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('rejeita somente após justificativa e segunda confirmação', async () => {
    item.status = 'UNDER_ANALYSIS';
    mount();
    const dialog = await openAction('Rejeitar ocorrência');
    fireEvent.change(dialog.getByLabelText('Justificativa'), { target: { value: 'Ocorrência duplicada verificada' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Revisar rejeição' }));
    expect(calls).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Sim, rejeitar' }));
    await waitFor(() => expect(calls[0]).toMatchObject({ action: 'reject', body: { justification: 'Ocorrência duplicada verificada' } }));
  });

  it.each(['RESOLVED', 'REJECTED', 'CONFIRMED'] as const)('bloqueia rejeição em %s', async status => {
    item.status = status;
    mount();
    await screen.findByRole('heading', { name: /Detalhes da ocorrência/ });
    expect(screen.queryByRole('button', { name: 'Rejeitar ocorrência' })).not.toBeInTheDocument();
    if (status !== 'CONFIRMED') expect(screen.queryByRole('button', { name: 'Encaminhar ocorrência' })).not.toBeInTheDocument();
  });

  it('refaz consulta após 409 e apresenta o conflito dentro do modal', async () => {
    conflict = true;
    mount();
    const dialog = await openAction('Iniciar análise');
    fireEvent.click(dialog.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('ocorrência foi alterada'));
    await screen.findByText('Resolvido');
    expect(calls).toHaveLength(1);
  });

  it.each(['SENT', 'FAILED'])('interpreta encaminhamento 201 %s', async status => {
    item.status = 'CONFIRMED';
    forwardingStatus = status;
    mount();
    const select = await screen.findByLabelText('Órgão responsável');
    await waitFor(() => expect(select).toBeEnabled());
    selectOption(select, agencyId);
    fireEvent.click(screen.getByRole('button', { name: 'Encaminhar ocorrência' }));
    await screen.findByText(status === 'SENT' ? 'Encaminhamento registrado e aceito pelo provedor de e-mail. A entrega ainda não foi confirmada.' : /registrado, mas o envio falhou/);
    expect(forwards).toBe(1);
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
    if (status === 'FAILED') expect(screen.getByRole('button', { name: 'Encaminhar ocorrência' })).toBeDisabled();
  });

  it.each(['INTERNAL', 'CITIZEN_RESPONSE'])('salva observação com visibilidade %s', async visibility => {
    mount();
    await screen.findByLabelText('Observação');
    fireEvent.change(screen.getByLabelText('Observação'), { target: { value: 'Texto de observação técnica' } });
    selectOption(screen.getByLabelText('Visibilidade'), visibility);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar observação' }));
    await waitFor(() => expect(calls[0]).toMatchObject({ action: 'observations', body: { content: 'Texto de observação técnica', visibility } }));
    await waitFor(() => expect(screen.getByLabelText('Observação')).toHaveValue(''));
  });

  it('apresenta histórico em Brasília e renova fotos expiradas', async () => {
    item.photoUrls[0].expiresAt = '2020-01-01T00:00:00Z';
    mount();
    await screen.findByText('Nota interna registrada');
    expect(screen.getAllByText('18/11/2026, 11:00').length).toBeGreaterThan(0);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    item.photoUrls[0].expiresAt = '2099-01-01T00:00:00Z';
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar fotos' }));
    expect(await screen.findByRole('img')).toHaveAttribute('src', 'https://example.com/signed-photo');
  });
});

