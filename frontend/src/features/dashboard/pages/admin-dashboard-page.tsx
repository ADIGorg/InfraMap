import { ArrowUpRight, BarChart3, Clock3, RefreshCw, ShieldAlert, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/shared/components/card';
import { StatusBadge } from '@/shared/components/status-badge';
import { cn } from '@/shared/utils/cn';
import { dashboardStatuses, type RecentOccurrence } from '../services/dashboard.service';
import { formatElapsedDays, formatOccurrenceDate } from '../utils/dashboard-format';
import { useAdminDashboardViewModel } from '../view-models/use-admin-dashboard-view-model';
import { DailyOccurrencesChart } from '../components/daily-occurrences-chart';

const priorityLabels = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
} as const;

function RecentItem({ item }: { item: RecentOccurrence }) {
  return (
    <tr className="border-b border-line-subtle last:border-0">
      <td className="px-3 py-4 text-sm font-semibold text-brand-primary">
        <Link className="hover:underline" to={'/admin/occurrences/' + item.id}
          title={'Ver ocorrência ' + item.id}>
          {'#' + item.id.slice(0, 8)}
        </Link>
      </td>
      <td className="px-3 py-4 text-sm font-medium text-ink-primary">
        {item.category.name || 'Categoria não informada'}
      </td>
      <td className="px-3 py-4"><StatusBadge status={item.status} /></td>
      <td className="px-3 py-4 text-sm text-ink-secondary">
        {item.priority ? priorityLabels[item.priority] : 'Não definida'}
      </td>
      <td className="px-3 py-4 text-sm text-ink-secondary">{formatOccurrenceDate(item.createdAt)}</td>
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
  if (isPending) return <p role="status" className="py-8 text-sm text-ink-secondary">Carregando ocorrências recentes…</p>;
  if (isError || !items) {
    return <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
      Não foi possível consultar as ocorrências recentes. Nenhum dado foi substituído por valores fictícios.
    </p>;
  }
  if (items.length === 0) {
    return <p role="status" className="py-8 text-sm text-ink-secondary">Nenhuma ocorrência registrada.</p>;
  }
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[600px] border-collapse text-left">
        <thead className="bg-surface-page text-xs font-semibold text-ink-secondary">
          <tr>
            <th scope="col" className="rounded-l-lg px-3 py-3">ID</th>
            <th scope="col" className="px-3 py-3">Categoria</th>
            <th scope="col" className="px-3 py-3">Status</th>
            <th scope="col" className="px-3 py-3">Prioridade</th>
            <th scope="col" className="rounded-r-lg px-3 py-3">Data</th>
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

  return (
    <div className="page-container space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Visão Geral do Saneamento</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Indicadores do banco de dados, ocorrências recentes e alertas de prazo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-line-subtle bg-white px-3 py-2 text-xs text-ink-secondary">
            Atualização automática a cada {vm.pollingSeconds} s
          </span>
          <button type="button" onClick={vm.refresh} disabled={vm.dashboard.isFetching || vm.recent.isFetching}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-brand-primary hover:bg-surface-info disabled:opacity-60">
            <RefreshCw aria-hidden="true" size={16} className={vm.dashboard.isFetching || vm.recent.isFetching ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </header>

      {vm.dashboard.isPending ? (
        <div role="status" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {dashboardStatuses.map((status) => (
            <Card key={status.key} className="min-h-28 animate-pulse">
              <p className="text-sm text-ink-secondary">{status.label}</p>
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
          <section aria-label="Ocorrências por status" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {dashboardStatuses.map((status) => (
              <Card key={status.key} className={cn('min-h-28 border-l-[5px] p-4', status.border)}>
                <h2 className="text-xs font-semibold text-ink-secondary">{status.label}</h2>
                <p className="mt-2 text-3xl font-extrabold tabular-nums text-ink-primary">
                  {data.counts_by_status[status.key].toLocaleString('pt-BR')}
                </p>
              </Card>
            ))}
          </section>

          <section aria-label="Indicadores gerenciais e prazos" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border border-line-subtle p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-secondary">
                <ShieldAlert size={18} className="text-red-500" aria-hidden="true" />
                Prioridade alta
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums">{data.high_priority_total.toLocaleString('pt-BR')}</p>
              <p className="mt-1 text-xs text-ink-secondary">Total de ocorrências classificadas como HIGH</p>
            </Card>
            <Card className="border border-line-subtle p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-secondary">
                <TrendingUp size={18} className="text-brand-primary" aria-hidden="true" />
                Tempo médio até resolução
              </div>
              <p className="mt-2 text-2xl font-bold">{formatElapsedDays(data.average_resolution_days)}</p>
              <p className="mt-1 text-xs text-ink-secondary">Dias corridos, apenas ocorrências resolvidas</p>
            </Card>
            <Card className="border border-line-subtle p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-secondary">
                <Clock3 size={18} className="text-orange-600" aria-hidden="true" />
                Recebidas além de 48 h
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums">
                {data.sla_breaches.received_over_48h.toLocaleString('pt-BR')}
              </p>
              <p className="mt-1 text-xs text-ink-secondary">Aguardando início de análise</p>
            </Card>
            <Card className="border border-line-subtle p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-secondary">
                <Clock3 size={18} className="text-orange-600" aria-hidden="true" />
                Em análise além de 5 dias
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums">
                {data.sla_breaches.under_analysis_over_5d.toLocaleString('pt-BR')}
              </p>
              <p className="mt-1 text-xs text-ink-secondary">Aguardando conclusão de triagem</p>
            </Card>
          </section>
        </>
      )}

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-ink-primary">
            <ShieldAlert aria-hidden="true" className="text-red-500" size={21} />
            Ocorrências recentes de prioridade alta
          </h2>
          {vm.recent.isPending ? (
            <p role="status" className="py-8 text-sm text-ink-secondary">Carregando prioridades recentes…</p>
          ) : vm.recent.isError ? (
            <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
              Não foi possível carregar a lista de ocorrências recentes.
            </p>
          ) : vm.highPriorityRecent.length === 0 ? (
            <p role="status" className="rounded-lg bg-surface-page p-5 text-sm text-ink-secondary">
              Nenhuma prioridade alta entre as cinco ocorrências mais recentes.
            </p>
          ) : (
            <ul className="space-y-3">
              {vm.highPriorityRecent.map((item) => (
                <li key={item.id} className="rounded-lg border border-line-subtle bg-surface-page p-4">
                  <div className="flex items-center justify-between gap-3 text-xs text-ink-secondary">
                    <span className="rounded-md bg-red-50 px-2 py-1 font-bold text-red-700">Alta</span>
                    <span>{formatOccurrenceDate(item.createdAt)}</span>
                  </div>
                  <Link className="mt-2 block text-sm font-semibold text-ink-primary hover:underline"
                    to={'/admin/occurrences/' + item.id}>
                    {item.category.name || 'Ocorrência sem categoria'}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-secondary">{item.description}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-ink-secondary">
            Lista restrita às 5 ocorrências recentes. O total de prioridades altas é calculado no banco.
          </p>
        </Card>
        <Card>
          <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-ink-primary">5 Ocorrências Mais Recentes</h2>
            <Link className="inline-flex items-center gap-1 text-sm font-semibold text-brand-primary hover:underline"
              to="/admin/occurrences">
              Ver todas <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </header>
          <RecentList isPending={vm.recent.isPending} isError={vm.recent.isError} items={vm.recent.data} />
          <div className="mt-5 rounded-lg bg-surface-page p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
              <BarChart3 size={18} aria-hidden="true" /> Ocorrências nos últimos 7 dias completos
            </h3>
            <DailyOccurrencesChart series={data?.daily_counts} pending={vm.dashboard.isPending} error={vm.dashboard.isError} />
          </div>
        </Card>
      </section>
    </div>
  );
}
