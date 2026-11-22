import { ArrowUpRight, BarChart3, Clock3, RefreshCw, SlidersHorizontal, ShieldAlert, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/shared/components/card';
import { StatusBadge } from '@/shared/components/status-badge';
import { cn } from '@/shared/utils/cn';
import { dashboardStatuses, type RecentOccurrence } from '../services/dashboard.service';
import { formatElapsedDays, formatOccurrenceDate } from '../utils/dashboard-format';
import { useAdminDashboardViewModel } from '../view-models/use-admin-dashboard-view-model';
import { useDashboardDisplayViewModel } from '../view-models/use-dashboard-display-view-model';
import { DailyOccurrencesChart } from '../components/daily-occurrences-chart';

const priorityLabels = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
} as const;

function RecentItem({ item }: { item: RecentOccurrence }) {
  return (
    <tr className="border-b border-line-subtle last:border-0">
      <td className="px-2.5 py-2 text-xs font-semibold text-brand-primary xl:py-3.5">
        <Link className="hover:underline" to={'/admin/occurrences/' + item.id}
          title={'Ver ocorrência ' + item.id}>
          {'#' + item.id.slice(0, 8)}
        </Link>
      </td>
      <td className="px-2.5 py-2 text-xs font-medium text-ink-primary xl:py-3.5">
        <span className="line-clamp-2" title={item.category.name}>{item.category.name || 'Categoria não informada'}</span>
      </td>
      <td className="px-2.5 py-2 xl:py-3.5"><StatusBadge status={item.status} /></td>
      <td className="px-2.5 py-2 text-xs text-ink-secondary xl:py-3.5">
        {item.priority ? priorityLabels[item.priority] : 'Não definida'}
      </td>
      <td className="px-2.5 py-2 text-xs text-ink-secondary xl:py-3.5">{formatOccurrenceDate(item.createdAt)}</td>
    </tr>
  );
}

function RecentList({
  isPending, isError, items,
}: {
  isPending: boolean;
  isError: boolean;
  items?: RecentOccurrence[];
}) {
  if (isPending) return <p role="status" className="py-8 text-xs text-ink-secondary">Carregando ocorrências recentes…</p>;
  if (isError || !items) {
    return <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
      Não foi possível consultar as ocorrências recentes. Nenhum dado foi substituído por valores fictícios.
    </p>;
  }
  if (items.length === 0) {
    return <p role="status" className="py-8 text-xs text-ink-secondary">Nenhuma ocorrência registrada.</p>;
  }
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-left">
        <thead className="bg-surface-page text-xs font-semibold text-ink-secondary">
          <tr>
            <th scope="col" className="rounded-l-lg px-2.5 py-2">ID</th>
            <th scope="col" className="px-2.5 py-2">Categoria</th>
            <th scope="col" className="px-2.5 py-2">Status</th>
            <th scope="col" className="px-2.5 py-2">Prioridade</th>
            <th scope="col" className="rounded-r-lg px-2.5 py-2">Data</th>
          </tr>
        </thead>
        <tbody>{items.map((item) => <RecentItem item={item} key={item.id} />)}</tbody>
      </table>
    </div>
  );
}

export function AdminDashboardPage() {
  const vm = useAdminDashboardViewModel();
  const data = vm.dashboard.data;
  const display = useDashboardDisplayViewModel();

  return (
    <div className="dashboard-page mx-auto w-full max-w-[1600px] space-y-3 px-4 py-4 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-primary">Visão Geral da Infraestrutura</h1>
          <p className="mt-1 text-xs text-ink-secondary">
            Indicadores do banco de dados, ocorrências recentes e alertas de prazo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <details className="relative">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-xs font-semibold text-ink-secondary hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary">
              <SlidersHorizontal size={15} aria-hidden="true" /> Exibir
            </summary>
            <fieldset className="absolute right-0 top-full z-20 mt-1 w-60 space-y-3 rounded-xl border border-line-subtle bg-white p-4 shadow-card">
              <legend className="sr-only">Blocos do dashboard</legend>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={display.showStatus} onChange={event => display.setShowStatus(event.target.checked)} aria-controls="dashboard-status" /> Totais por status</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={display.showMetrics} onChange={event => display.setShowMetrics(event.target.checked)} aria-controls="dashboard-metrics" /> Indicadores e prazos</label>
            </fieldset>
          </details>
          <span className="rounded-full border border-line-subtle bg-white px-3 py-2 text-xs text-ink-secondary">
            Atualização automática a cada {vm.pollingSeconds} s
          </span>
          <button type="button" onClick={vm.refresh} disabled={vm.dashboard.isFetching || vm.recent.isFetching || vm.highPriority.isFetching}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-brand-primary hover:bg-surface-info disabled:opacity-60">
            <RefreshCw aria-hidden="true" size={16} className={vm.dashboard.isFetching || vm.recent.isFetching || vm.highPriority.isFetching ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </header>

      {vm.dashboard.isPending ? (
        <div role="status" hidden={!display.showStatus} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {dashboardStatuses.map((status) => (
            <Card key={status.key} className="min-h-20 animate-pulse p-3">
              <p className="text-xs text-ink-secondary">{status.label}</p>
              <div className="mt-4 h-8 rounded bg-slate-100" />
            </Card>
          ))}
        </div>
      ) : vm.dashboard.isError || !data ? (
        <Card role="alert" className="border border-red-200 bg-red-50">
          <h2 className="font-bold text-red-800">Não foi possível carregar o dashboard</h2>
          <p className="mt-2 text-sm text-red-800">
            Verifique a conexão com a API. Os indicadores não serão preenchidos com zeros artificiais.
          </p>
        </Card>
      ) : (
        <>
          {vm.dashboard.isFetching && (
            <p role="status" className="text-xs text-ink-secondary">Atualizando indicadores…</p>
          )}
          <section id="dashboard-status" hidden={!display.showStatus} aria-label="Ocorrências por status" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {dashboardStatuses.map((status) => (
              <Link key={status.key} to={'/admin/occurrences?status=' + status.key}
                aria-label={'Ver ocorrências com status ' + status.label}
                className={cn('block rounded-2xl border-l-4 bg-white px-4 py-3 shadow-card transition hover:bg-surface-info hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary', status.border)}>
                <h2 className="text-xs font-semibold text-ink-secondary">{status.label}</h2>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-ink-primary">
                  {data.counts_by_status[status.key].toLocaleString('pt-BR')}
                </p>
              </Link>
            ))}
          </section>

          <section id="dashboard-metrics" hidden={!display.showMetrics} aria-label="Indicadores gerenciais e prazos" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border border-line-subtle px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-secondary">
                <ShieldAlert size={18} className="text-red-500" aria-hidden="true" />
                Prioridade alta
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums">{data.high_priority_total.toLocaleString('pt-BR')}</p>
              <p className="mt-1 text-xs text-ink-secondary">Total de ocorrências classificadas como HIGH</p>
            </Card>
            <Card className="border border-line-subtle px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-secondary">
                <TrendingUp size={18} className="text-brand-primary" aria-hidden="true" />
                Tempo médio até resolução
              </div>
              <p className="mt-1 text-xl font-bold">{formatElapsedDays(data.average_resolution_days)}</p>
              <p className="mt-1 text-xs text-ink-secondary">Dias corridos, apenas ocorrências resolvidas</p>
            </Card>
            <Card className="border border-line-subtle px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-secondary">
                <Clock3 size={18} className="text-orange-600" aria-hidden="true" />
                Recebidas além de 48 h
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {data.sla_breaches.received_over_48h.toLocaleString('pt-BR')}
              </p>
              <p className="mt-1 text-xs text-ink-secondary">Aguardando início de análise</p>
            </Card>
            <Card className="border border-line-subtle px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-secondary">
                <Clock3 size={18} className="text-orange-600" aria-hidden="true" />
                Em análise além de 5 dias
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {data.sla_breaches.under_analysis_over_5d.toLocaleString('pt-BR')}
              </p>
              <p className="mt-1 text-xs text-ink-secondary">Aguardando conclusão de triagem</p>
            </Card>
          </section>
        </>
      )}

      <section className="grid items-stretch gap-3 xl:grid-cols-2">
        <Card className="min-w-0 p-4">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink-primary">5 Ocorrências Mais Recentes</h2>
            <Link className="inline-flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"
              to="/admin/occurrences">
              Ver todas <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </header>
          <RecentList isPending={vm.recent.isPending} isError={vm.recent.isError} items={vm.recent.data} />
        </Card>
        <Card className="flex min-w-0 flex-col p-4">
          <div role="tablist" aria-label="Detalhes do dashboard" className="mb-3 flex w-fit gap-1 rounded-lg bg-surface-page p-1"
            onKeyDown={event => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const panel = event.key === 'Home' ? 'chart' : event.key === 'End' ? 'priorities' : display.activePanel === 'chart' ? 'priorities' : 'chart';
              display.setActivePanel(panel);
              event.currentTarget.querySelector<HTMLButtonElement>(`#dashboard-${panel === 'chart' ? 'chart' : 'priorities'}-tab`)?.focus();
            }}>
            <button type="button" role="tab" id="dashboard-chart-tab" aria-controls="dashboard-chart-panel" aria-selected={display.activePanel === 'chart'} onClick={() => display.setActivePanel('chart')}
              tabIndex={display.activePanel === 'chart' ? 0 : -1}
              className={cn('rounded-md px-3 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary', display.activePanel === 'chart' ? 'bg-white text-brand-primary shadow-sm' : 'text-ink-secondary')}>Gráfico</button>
            <button type="button" role="tab" id="dashboard-priorities-tab" aria-controls="dashboard-priorities-panel" aria-selected={display.activePanel === 'priorities'} onClick={() => display.setActivePanel('priorities')}
              tabIndex={display.activePanel === 'priorities' ? 0 : -1}
              className={cn('rounded-md px-3 py-1.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary', display.activePanel === 'priorities' ? 'bg-white text-brand-primary shadow-sm' : 'text-ink-secondary')}>Prioridades ({vm.highPriority.data?.pagination.total ?? data?.high_priority_total ?? '—'})</button>
          </div>
          <div className="dashboard-detail-panels grid flex-1">
          <div id="dashboard-chart-panel" className="col-start-1 row-start-1 flex min-w-0 flex-col" hidden={display.activePanel !== 'chart'} role="tabpanel" aria-labelledby="dashboard-chart-tab">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
              <BarChart3 size={18} aria-hidden="true" /> Ocorrências nos últimos 7 dias completos
            </h3>
            <DailyOccurrencesChart series={data?.daily_counts} pending={vm.dashboard.isPending} error={vm.dashboard.isError} />
          </div>
          <div id="dashboard-priorities-panel" className="col-start-1 row-start-1 flex min-w-0 flex-col" hidden={display.activePanel !== 'priorities'} role="tabpanel" aria-labelledby="dashboard-priorities-tab">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-primary">
            <ShieldAlert aria-hidden="true" className="text-red-500" size={18} />
            Ocorrências de prioridade alta
          </h2>
          {vm.highPriority.isPending ? (
            <p role="status" className="py-3 text-xs text-ink-secondary">Carregando ocorrências de prioridade alta…</p>
          ) : vm.highPriority.isError ? (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              Não foi possível carregar as ocorrências de prioridade alta.
            </p>
          ) : !vm.highPriority.data?.data.length ? (
            <p role="status" className="rounded-lg bg-surface-page p-3 text-xs text-ink-secondary">
              Nenhuma ocorrência de prioridade alta.
            </p>
          ) : (
            <ul className="space-y-2">
              {vm.highPriority.data.data.map((item) => (
                <li key={item.id} className="rounded-lg border border-line-subtle bg-surface-page px-3 py-2">
                  <div className="flex items-center justify-between gap-3 text-xs text-ink-secondary">
                    <span className="font-semibold text-red-700">Alta</span>
                    <span>{formatOccurrenceDate(item.createdAt)}</span>
                  </div>
                  <Link className="mt-1 block truncate text-xs font-semibold text-ink-primary hover:underline"
                    title={item.category.name}
                    to={'/admin/occurrences/' + item.id}>
                    {item.category.name || 'Ocorrência sem categoria'}
                  </Link>
                  <p className="truncate text-xs text-ink-secondary" title={item.description}>{item.description}</p>
                </li>
              ))}
            </ul>
          )}
          {vm.highPriority.isError && <button type="button" onClick={() => void vm.highPriority.refetch()} disabled={vm.highPriority.isFetching} className="mt-2 text-xs font-semibold text-brand-primary underline">Tentar carregar prioridades novamente</button>}
          {vm.highPriority.isSuccess && <div className="mt-auto flex min-h-11 flex-wrap items-center justify-between gap-2 pt-3 text-xs">
            <Link to="/admin/occurrences?priority=HIGH" className="inline-flex min-h-8 items-center rounded font-semibold text-brand-primary hover:underline">Ver todas as prioridades altas</Link>
            {vm.priorityTotalPages > 1 && <nav aria-label="Paginação de prioridades" className="flex items-center gap-2">
              <button type="button" aria-label="Prioridades anteriores" disabled={vm.priorityPage === 1 || vm.highPriority.isFetching} onClick={() => vm.setPriorityPage(vm.priorityPage - 1)} className="min-h-8 rounded px-2 text-brand-primary disabled:opacity-40">Anterior</button>
              <span>{vm.priorityPage} / {vm.priorityTotalPages}</span>
              <button type="button" aria-label="Próximas prioridades" disabled={vm.priorityPage >= vm.priorityTotalPages || vm.highPriority.isFetching} onClick={() => vm.setPriorityPage(vm.priorityPage + 1)} className="min-h-8 rounded px-2 text-brand-primary disabled:opacity-40">Próxima</button>
            </nav>}
          </div>}
          </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
