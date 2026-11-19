import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AgenciesPage } from './agencies-page';
import { useAgenciesManagementViewModel } from '../view-models/use-agencies-management-view-model';

vi.mock('@/infrastructure/api/http-client', () => ({ http: vi.fn() }));
vi.mock('../view-models/use-agencies-management-view-model', () => ({
  useAgenciesManagementViewModel: vi.fn(),
}));

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
const inactive = { ...agency, id: 'aa0bb40b-6962-41ee-a020-f68ea96d240d', name: 'Órgão inativo', is_active: false };
const refresh = vi.fn(), openCreate = vi.fn(), openEdit = vi.fn();
function setup(extra: Record<string, unknown> = {}) {
  const vm = {
    identity: { data: { role: 'ADMIN', is_active: true }, isPending: false },
    canManage: false,
    agencies: { data: [agency, inactive], isSuccess: true, isPending: false,
      isError: false, isFetching: false, refetch: refresh },
    filtered: [agency, inactive],
    search: '', setSearch: vi.fn(), onlyActive: false, setOnlyActive: vi.fn(),
    notice: null, isCreating: false, editing: null, deactivating: null,
    openCreate, openEdit, startDeactivate: vi.fn(),
    closeForm: vi.fn(), closeDeactivation: vi.fn(),
    create: { isPending: false, mutateAsync: vi.fn() },
    edit: { isPending: false, mutateAsync: vi.fn(), isError: false, error: null },
    activate: vi.fn(), deactivate: vi.fn(), refresh,
    ...extra,
  };
  vi.mocked(useAgenciesManagementViewModel).mockReturnValue(
    vm as unknown as ReturnType<typeof useAgenciesManagementViewModel>,
  );
}
describe('AgenciesPage', () => {
  beforeEach(() => { vi.clearAllMocks(); setup(); });
  it('ADMIN sem nível MASTER vê catálogo, mas nenhuma ação privilegiada', () => {
    render(<AgenciesPage />);
    expect(screen.getByRole('heading', { name: 'Gestão de Órgãos' })).toBeInTheDocument();
    expect(screen.getByText('Secretaria de Obras')).toBeInTheDocument();
    expect(screen.getAllByText('Somente consulta')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Cadastrar órgão' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Permissão de gestão não confirmada');
  });
  it('apresenta permissões de consulta para OPERATIONAL sem citar bloqueio obsoleto da API1-100', () => {
    setup({ identity: {
      data: { role: 'ADMIN', is_active: true, admin_level: 'OPERATIONAL' },
      isPending: false,
    } });
    render(<AgenciesPage />);
    expect(screen.getByRole('note')).toHaveTextContent('Você está conectado como administrador OPERATIONAL');
    expect(screen.getByRole('note')).not.toHaveTextContent('API1-100');
    expect(screen.queryByRole('button', { name: 'Cadastrar órgão' })).not.toBeInTheDocument();
  });
  it('não mostra aviso de permissão durante verificação da identidade', () => {
    setup({ identity: { data: undefined, isPending: true } });
    render(<AgenciesPage />);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
  it('oculta órgãos inativos e atualiza a consulta', () => {
    render(<AgenciesPage />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Exibir inativos' }));
    expect(screen.queryByText('Órgão inativo')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    expect(refresh).toHaveBeenCalledOnce();
  });
  it('distingue catálogo vazio de falha da API', () => {
    setup({ agencies: { data: [], isSuccess: true, isPending: false, isError: false, isFetching: false }, filtered: [] });
    const view = render(<AgenciesPage />);
    expect(screen.getByText('Nenhum órgão foi cadastrado ainda.')).toBeInTheDocument();
    view.unmount();
    setup({
      agencies: { data: undefined, isSuccess: false, isPending: false, isError: true, isFetching: false, error: Error('offline') },
      filtered: [],
    });
    render(<AgenciesPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível consultar o catálogo');
  });
  it('apenas ViewModel que confirma MASTER libera os controles', () => {
    setup({ canManage: true });
    render(<AgenciesPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar órgão' }));
    expect(openCreate).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Editar Secretaria de Obras' }));
    expect(openEdit).toHaveBeenCalledWith(agency);
  });
});