import { Button } from '@/shared/components/button';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { DataTable, type TableColumn } from '@/shared/components/data-table';
import { ForbiddenScreen } from '@/shared/components/forbidden-screen';
import { LoadingScreen } from '@/shared/components/loading-screen';
import { safeErrorMessage } from '@/shared/errors/app-error';
import type { Administrator } from '../services/administrators.service';
import { AdministratorForm } from '../components/administrator-form';
import { useAdminManagementViewModel } from '../view-models/use-admin-management-view-model';

export function AdminAdminsPage() {
  const vm = useAdminManagementViewModel();
  if (vm.identity.isPending) return <LoadingScreen />;
  if (!vm.allowed) return <ForbiddenScreen master />;
  const disabled = vm.pending || !vm.list.isSuccess || vm.list.isFetching;
  const columns: TableColumn<Administrator>[] = [
    { key: 'name', title: 'Nome', render: item => <span className="font-semibold">{item.name}{item.id === vm.identity.data?.id && ' (você)'}</span> },
    { key: 'level', title: 'Perfil', render: item => item.admin_level === 'MASTER' ? 'Master' : 'Operacional' },
    { key: 'status', title: 'Situação', render: item => <span className={item.is_active ? 'text-green-700' : 'text-red-700'}>{item.is_active ? 'Ativo' : 'Inativo'}</span> },
    { key: 'actions', title: 'Ações', render: item => <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" disabled={disabled || vm.lastMaster(item)}
          aria-label={`${item.is_active ? 'Desativar' : 'Ativar'} ${item.name}`}
          onClick={() => vm.setSelection({ item, changes: { is_active: !item.is_active }, title: `${item.is_active ? 'Desativar' : 'Ativar'} administrador` })}>
          {item.is_active ? 'Desativar' : 'Ativar'}</Button>
        <Button variant="outline" disabled={disabled || vm.lastMaster(item)}
          aria-label={`Alterar perfil de ${item.name}`}
          onClick={() => vm.setSelection({ item, changes: { admin_level: item.admin_level === 'MASTER' ? 'OPERATIONAL' : 'MASTER' },
            title: item.admin_level === 'MASTER' ? 'Alterar para Operacional' : 'Promover a Master' })}>
          {item.admin_level === 'MASTER' ? 'Tornar operacional' : 'Promover a Master'}</Button>
      </div>
      {vm.lastMaster(item) && <p className="text-xs text-ink-secondary">O último MASTER ativo deve ser preservado.</p>}
    </div> },
  ];
  return (
    <div className="page-container space-y-6">
      <p className="rounded-lg border border-brand-primary bg-surface-info p-4 text-sm text-brand-primary"><strong>ACESSO MASTER</strong> — Gestão de acessos institucionais.</p>
      <header><h1 className="text-2xl font-extrabold">Administradores do Sistema</h1>
        <p className="mt-2 text-sm text-ink-secondary">Cadastre administradores e gerencie seus perfis e acessos.</p></header>
      {vm.error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{vm.error}</p>}
      {vm.message && <p role="status" className="rounded-lg bg-green-50 p-4 text-green-800">{vm.message}</p>}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-4" aria-label="Lista de administradores">
          <Button variant="outline" disabled={vm.pending || vm.list.isFetching} onClick={() => void vm.list.refetch()}>Atualizar lista</Button>
          {vm.list.isPending && <p role="status">Carregando administradores…</p>}
          {vm.list.isError && <p role="alert">{safeErrorMessage(vm.list.error)} Atualize a lista para tentar novamente.</p>}
          {vm.list.data && <DataTable columns={columns} rows={vm.list.data} getRowKey={item => item.id} emptyMessage="Nenhum administrador encontrado." />}
        </section>
        <AdministratorForm disabled={disabled} onCreate={vm.create} />
      </div>
      <ConfirmDialog open={!!vm.selection} title={vm.selection?.title ?? 'Confirmar alteração'}
        description={vm.selection ? `${vm.selection.title}: ${vm.selection.item.name}.${vm.selection.item.id === vm.identity.data?.id ? ' Esta alteração pode encerrar seu acesso à gestão administrativa.' : ''}` : ''}
        destructive={vm.selection?.changes.is_active === false || vm.selection?.changes.admin_level === 'OPERATIONAL'}
        isPending={vm.pending} onCancel={() => vm.setSelection(null)} onConfirm={() => void vm.confirm()} />
    </div>
  );
}

