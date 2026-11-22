import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LoaderCircle, Play, ThumbsUp } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { DataTable, type TableColumn } from '@/shared/components/data-table';
import { StatusBadge } from '@/shared/components/status-badge';
import { safeErrorMessage } from '@/shared/errors/app-error';
import { OccurrenceFilters } from '../components/occurrence-filters';
import { useAdminOccurrencesViewModel } from '../view-models/use-admin-occurrences-view-model';
import type { AdminOccurrence } from '../services/admin-occurrences.service';

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
const priorities = {
  LOW: { label: 'Baixa', color: 'bg-green-50 text-green-700' },
  MEDIUM: { label: 'Média', color: 'bg-amber-50 text-amber-800' },
  HIGH: { label: 'Alta', color: 'bg-red-50 text-red-700' },
};
const detailActions = { UNDER_ANALYSIS: 'Analisar', CONFIRMED: 'Atender', IN_SERVICE: 'Resolver', RESOLVED: 'Ver detalhes', REJECTED: 'Ver detalhes', RECEIVED: 'Ver detalhes' };

export function AdminOccurrencesPage() {
  const vm = useAdminOccurrencesViewModel();
  const pagination = vm.list.data?.pagination;
  const columns: TableColumn<AdminOccurrence>[] = [
    { key: 'id', title: 'ID', render: item => <Link className="font-bold text-brand-primary underline-offset-4 hover:underline" to={'/admin/occurrences/' + item.id} title={item.id}>#OC-{item.id.slice(0, 4).toUpperCase()}</Link> },
    { key: 'category', title: 'Categoria', render: item => <span className="font-semibold">{item.category.name || 'Categoria indisponível'}</span> },
    { key: 'status', title: 'Status', render: item => <StatusBadge status={item.status} /> },
    { key: 'priority', title: 'Prioridade', render: item => item.priority ? <span className={'rounded-md px-2 py-1 text-xs font-semibold ' + priorities[item.priority].color}>{priorities[item.priority].label}</span> : <span aria-label="Sem prioridade">—</span> },
    { key: 'votes', title: 'Curtidas', render: item => <span className="inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums text-ink-secondary"
      aria-label={`${item.votesCount.toLocaleString('pt-BR')} ${item.votesCount === 1 ? 'curtida' : 'curtidas'}`}>
      <ThumbsUp size={15} aria-hidden="true" />{item.votesCount.toLocaleString('pt-BR')}</span> },
    { key: 'date', title: 'Data', render: item => <time className="whitespace-nowrap text-ink-secondary" dateTime={item.createdAt}>{dateFormat.format(new Date(item.createdAt))}</time> },
    { key: 'actions', title: 'Ações', render: item => <div className="flex items-center gap-2">
      {item.status === 'RECEIVED' && <Button variant="ghost" className="px-2 text-green-700" aria-label={'Iniciar análise da ocorrência ' + item.id}
        disabled={!vm.canAct || vm.isPending || vm.list.isFetching || vm.list.isError} onClick={() => vm.requestAnalysis(item)}><Play size={17} aria-hidden="true" />Iniciar análise</Button>}
      <Link className="whitespace-nowrap rounded-lg px-2 py-3 text-sm font-semibold text-brand-primary hover:bg-surface-info"
        to={'/admin/occurrences/' + item.id}>{detailActions[item.status]}</Link>
    </div> },
  ];
  return (
    <div className="page-container">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold">Controle de Ocorrências</h1><p className="mt-1 text-sm text-ink-secondary">Consulte ocorrências e acompanhe a triagem e o atendimento.</p></div>
        {vm.list.isFetching && <span role="status" className="flex items-center gap-2 rounded-lg bg-surface-info px-3 py-2 text-xs text-brand-primary"><LoaderCircle size={16} className="animate-spin" aria-hidden="true" />Atualizando ocorrências…</span>}
      </header>
      {vm.filterError ? <div role="alert" className="rounded-xl bg-white p-6"><p>Os filtros da URL são inválidos. {vm.filterError}</p><Button className="mt-3" onClick={vm.clearFilters}>Limpar filtros</Button></div>
        : vm.filters && <OccurrenceFilters key={JSON.stringify(vm.filters)} filters={vm.filters} categories={vm.categories.data ?? []}
          categoriesUnavailable={!vm.categories.isSuccess} onChange={vm.changeFilters} onClear={vm.clearFilters} />}
      {vm.categories.isError && <div role="alert" className="mb-4 text-sm"><p>Não foi possível carregar as categorias.</p><Button variant="ghost" onClick={() => void vm.categories.refetch()}>Recarregar categorias</Button></div>}
      {vm.notice && <p role={vm.notice.error ? 'alert' : 'status'} className={'mb-4 rounded-lg p-4 text-sm ' + (vm.notice.error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800')}>{vm.notice.text}</p>}
      {vm.identity.isError && <p role="alert">{safeErrorMessage(vm.identity.error)}</p>}
      {vm.list.isError && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-white p-5"><p>{safeErrorMessage(vm.list.error)}</p><Button className="mt-3" onClick={() => void vm.list.refetch()}>Tentar novamente</Button></div>}
      {vm.filters && vm.list.isPending && vm.canAct && <div role="status" className="rounded-xl bg-white p-8 text-center text-ink-secondary">Carregando ocorrências…</div>}
      {vm.canAct && vm.list.isSuccess && <section aria-label="Lista de ocorrências" aria-busy={vm.list.isFetching} className="rounded-xl bg-white shadow-sm">
        <DataTable columns={columns} rows={vm.list.data.data} getRowKey={item => item.id} emptyMessage="Nenhuma ocorrência encontrada para os filtros selecionados." />
        {pagination && <footer className="flex flex-wrap items-center justify-between gap-4 rounded-b-xl bg-surface-page p-4">
          <p role="status" className="text-sm text-ink-secondary">
            {pagination.total === 0 || vm.list.data.data.length === 0 ? '0' : (pagination.page - 1) * pagination.pageSize + 1}
            {vm.list.data.data.length > 0 && '–' + Math.min((pagination.page - 1) * pagination.pageSize + vm.list.data.data.length, pagination.total)} de {pagination.total} ocorrências
          </p>
          <nav aria-label="Paginação" className="flex items-center gap-3">
            <Button variant="outline" disabled={pagination.page <= 1 || vm.list.isFetching} onClick={() => vm.changeFilters({ page: pagination.page - 1 })}><ChevronLeft size={16} aria-hidden="true" />Anterior</Button>
            <span className="text-sm">Página {pagination.page} de {Math.max(1, pagination.totalPages)}</span>
            <Button variant="outline" disabled={pagination.page >= pagination.totalPages || vm.list.isFetching} onClick={() => vm.changeFilters({ page: pagination.page + 1 })}>Próxima<ChevronRight size={16} aria-hidden="true" /></Button>
          </nav>
        </footer>}
      </section>}
      <ConfirmDialog open={!!vm.selected} title="Iniciar análise?" description="A ocorrência passará de Recebido para Em análise."
        isPending={vm.isPending} onCancel={() => vm.setSelected(null)} onConfirm={vm.confirmAnalysis} />
    </div>
  );
}

