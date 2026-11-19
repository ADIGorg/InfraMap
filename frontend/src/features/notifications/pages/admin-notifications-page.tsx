import { Button } from '@/shared/components/button';
import { safeErrorMessage } from '@/shared/errors/app-error';
import { AdminAlertList } from '../components/admin-alert-list';
import { formatAlertDate } from '../utils/format-alert-date';
import { useAdminNotificationsViewModel } from '../view-models/use-admin-notifications-view-model';

export function AdminNotificationsPage() {
  const vm = useAdminNotificationsViewModel();
  const loaded = vm.occurrences.isSuccess && vm.dashboard.isSuccess;
  return (
    <div className="page-container">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-extrabold">Notificações</h1>
          <p className="mt-2 text-sm text-ink-secondary">Ocorrências recentes e alertas de prazo. Atualização automática a cada 30 segundos enquanto esta tela estiver aberta.</p>
        </div>
        <Button variant="outline" onClick={vm.refresh} disabled={!vm.online || vm.busy}>Atualizar alertas</Button>
      </div>
      {!vm.online && <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-4">Sem conexão. A atualização está pausada; os dados já carregados podem estar desatualizados.</p>}
      {vm.identity.isError && <p role="alert">{safeErrorMessage(vm.identity.error)}</p>}
      <div className="mb-4 space-y-1 text-xs text-ink-secondary" aria-live="polite">
        {vm.busy && <p>Atualizando alertas…</p>}
        {!!vm.occurrences.dataUpdatedAt && <p>Ocorrências: última consulta bem-sucedida em {formatAlertDate(vm.occurrences.dataUpdatedAt)}.</p>}
        {!!vm.dashboard.dataUpdatedAt && <p>SLA: última consulta bem-sucedida em {formatAlertDate(vm.dashboard.dataUpdatedAt)}.</p>}
      </div>
      {vm.occurrences.isError && <p role="alert" className="mb-4">Não foi possível atualizar as ocorrências. {safeErrorMessage(vm.occurrences.error)} Os dados anteriores, se exibidos, podem estar desatualizados.</p>}
      {vm.dashboard.isError && <p role="alert" className="mb-4">Não foi possível atualizar os prazos. {safeErrorMessage(vm.dashboard.error)} As contagens anteriores, se exibidas, podem estar desatualizadas.</p>}
      <section className="overflow-hidden rounded-2xl border border-line-subtle bg-white shadow-sm" aria-label="Central de notificações">
        <div className="border-b border-line-subtle p-4">
          <Button variant="ghost" disabled={!vm.alerts.some(alert => !vm.isViewed(alert))}
            onClick={() => vm.markViewed(vm.alerts)}>Marcar alertas exibidos como visualizados</Button>
          <p className="mt-2 text-xs text-ink-secondary">A marcação vale apenas nesta sessão do navegador e é perdida ao recarregar ou sair da conta. Não é sincronizada com o servidor.</p>
        </div>
        {vm.online && !vm.alerts.length && (vm.occurrences.isPending || vm.dashboard.isPending) && <p role="status" className="p-6">Carregando alertas…</p>}
        {loaded && !vm.alerts.length && <p className="p-6">Nenhum alerta disponível.</p>}
        <AdminAlertList alerts={vm.alerts} isViewed={vm.isViewed} onView={alert => vm.markViewed([alert])} />
        <footer className="flex flex-wrap items-center justify-between gap-4 bg-surface-page p-4 text-sm">
          <p>{vm.occurrences.data ? `${vm.occurrences.data.data.length} de ${vm.occurrences.data.pagination.total} ocorrências · Página ${vm.page} de ${vm.totalPages}` : 'Aguardando lista de ocorrências'}<br /><span className="text-xs text-ink-secondary">Os alertas de SLA são totais e aparecem em todas as páginas.</span></p>
          <nav aria-label="Paginação de ocorrências" className="flex gap-2">
            <Button variant="outline" disabled={vm.page === 1 || vm.busy || !vm.online} onClick={() => vm.setPage(vm.page - 1)}>Anterior</Button>
            <Button variant="outline" disabled={vm.page >= vm.totalPages || vm.busy || !vm.online || !vm.occurrences.isSuccess} onClick={() => vm.setPage(vm.page + 1)}>Próxima</Button>
          </nav>
        </footer>
      </section>
    </div>
  );
}

