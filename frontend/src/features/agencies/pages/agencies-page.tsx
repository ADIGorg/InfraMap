import { useState } from 'react';
import { Building2, Plus, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { DataTable, type TableColumn } from '@/shared/components/data-table';
import { safeErrorMessage } from '@/shared/errors/app-error';
import { AgencyFormDialog } from '../components/agency-form-dialog';
import { type Agency } from '../services/agencies.service';
import { useAgenciesManagementViewModel } from '../view-models/use-agencies-management-view-model';

export function AgenciesPage() {
  const vm = useAgenciesManagementViewModel();
  const [showInactive, setShowInactive] = useState(true);
  const agencies = vm.agencies.data ?? [];
  const displayRows = showInactive ? vm.filtered : vm.filtered.filter((item) => item.is_active);
  const columns: Array<TableColumn<Agency>> = [
    {
      key: 'name', title: 'Órgão',
      render: (item) => <span className="font-semibold text-brand-primary">{item.name}</span>,
    },
    {
      key: 'contact', title: 'Contato',
      render: (item) => <div className="space-y-1">
        <p className="break-all">{item.email}</p>
        <p className="text-xs text-ink-secondary">{item.phone || 'Telefone não informado'}</p>
      </div>,
    },
    {
      key: 'description', title: 'Descrição',
      render: (item) => <span className="text-ink-secondary">{item.description || '—'}</span>,
    },
    {
      key: 'status', title: 'Situação',
      render: (item) => (
        <span className={
          item.is_active
            ? 'rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800'
            : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700'
        }>
          {item.is_active ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      key: 'actions', title: 'Ações',
      render: (item) => vm.canManage ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-label={"Editar " + item.name} className="font-semibold text-brand-primary underline"
            onClick={() => vm.openEdit(item)}>Editar</button>
          {item.is_active ? (
            <button type="button" aria-label={"Desativar " + item.name} className="font-semibold text-red-700 underline"
              onClick={() => vm.startDeactivate(item)}>Desativar</button>
          ) : (
            <button type="button" aria-label={"Reativar " + item.name} className="font-semibold text-green-700 underline"
              disabled={vm.edit.isPending} onClick={() => vm.activate(item)}>Reativar</button>
          )}
        </div>
      ) : <span className="text-xs text-ink-secondary">Somente consulta</span>,
    },
  ];

  return (
    <div className="page-container space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-primary">
            <Building2 size={26} aria-hidden="true" /> Gestão de Órgãos
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Catálogo institucional de órgãos responsáveis pelo atendimento das ocorrências.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={vm.refresh}
            isLoading={vm.agencies.isFetching}>
            <RefreshCw size={16} aria-hidden="true" /> Atualizar
          </Button>
          {vm.canManage && (
            <Button type="button" onClick={vm.openCreate}>
              <Plus size={16} aria-hidden="true" /> Cadastrar órgão
            </Button>
          )}
        </div>
      </header>

      {!vm.canManage && (
        <p role="note" className="rounded-xl border border-blue-200 bg-surface-info p-4 text-sm text-brand-primary">
          Consulta disponível para administradores ativos. Cadastro, edição e desativação exigem nível
          MASTER confirmado pela API. Até a entrega da API1-100, essas ações permanecem bloqueadas.
        </p>
      )}
      {vm.notice && (
        <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{vm.notice}</p>
      )}
      {vm.edit.isError && !vm.editing && !vm.deactivating && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {safeErrorMessage(vm.edit.error)}
        </p>
      )}

      <section className="rounded-xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-sm font-semibold text-ink-primary">
              {vm.agencies.isSuccess ? agencies.length + ' órgãos cadastrados' : 'Catálogo de órgãos'}
            </p>
            <p className="text-xs text-ink-secondary">
              {vm.agencies.isSuccess ? agencies.filter((item) => item.is_active).length + ' ativos' : 'Dados da API'}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)} />
            Exibir inativos
          </label>
        </div>
        <label className="mt-4 flex max-w-md items-center gap-2 rounded-lg border border-line px-3 py-2">
          <Search size={17} aria-hidden="true" className="text-ink-secondary" />
          <span className="sr-only">Buscar órgãos</span>
          <input aria-label="Buscar órgãos" className="w-full bg-transparent outline-none"
            value={vm.search} onChange={(event) => vm.setSearch(event.target.value)}
            placeholder="Buscar por nome ou e-mail" />
        </label>
      </section>

      {vm.agencies.isPending ? (
        <p role="status" className="rounded-xl bg-white p-6 text-ink-secondary">Carregando órgãos cadastrados…</p>
      ) : vm.agencies.isError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-800">Não foi possível consultar o catálogo de órgãos.</p>
          <p className="mt-1 text-sm text-red-700">{safeErrorMessage(vm.agencies.error)}</p>
          <Button type="button" className="mt-4" variant="outline" onClick={vm.refresh}>Tentar novamente</Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={displayRows}
          getRowKey={(item) => item.id}
          emptyMessage={agencies.length === 0
            ? 'Nenhum órgão foi cadastrado ainda.'
            : 'Nenhum órgão corresponde aos filtros.'}
        />
      )}

      {vm.canManage && (
        <>
          <AgencyFormDialog
            isOpen={vm.isCreating || vm.editing !== null}
            item={vm.editing}
            isPending={vm.create.isPending || vm.edit.isPending}
            onClose={vm.closeForm}
            onSave={(values) => vm.editing
              ? vm.edit.mutateAsync({ id: vm.editing.id, changes: values })
              : vm.create.mutateAsync(values)}
          />
          <ConfirmDialog
            open={vm.deactivating !== null}
            title="Confirmar desativação"
            description={'Deseja desativar ' + (vm.deactivating?.name ?? 'este órgão') +
              '? Ele deixará de aparecer em novos encaminhamentos, mas os registros antigos serão mantidos.'}
            destructive
            isPending={vm.edit.isPending}
            onCancel={vm.closeDeactivation}
            onConfirm={vm.deactivate}
          />
        </>
      )}
    </div>
  );
}