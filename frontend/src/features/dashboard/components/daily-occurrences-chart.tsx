import type { DailyCount } from '../services/dashboard.service';

// A API já envia datas de calendário local: não converter YYYY-MM-DD em hora local.
const label = (date: string) => date.slice(8, 10) + '/' + date.slice(5, 7);

export function DailyOccurrencesChart({ series, pending, error }: {
  series?: DailyCount[]; pending: boolean; error: boolean;
}) {
  if (pending) return <p role="status" className="mt-2 text-xs text-ink-secondary">Carregando série diária…</p>;
  if (error) return <p role="alert" className="mt-2 text-xs text-red-800">Não foi possível atualizar a série diária. Tente atualizar o dashboard.</p>;
  if (!series) return <p role="status" className="mt-2 text-xs text-ink-secondary">Dados diários indisponíveis nesta versão da API.</p>;
  const total = series.reduce((sum, day) => sum + day.count, 0);
  const maximum = Math.max(1, ...series.map(day => day.count));
  return <figure aria-label="Ocorrências por dia nos sete dias completos anteriores a hoje" className="mt-3">
    <figcaption className="text-xs text-ink-secondary">
      {label(series[0].date)} a {label(series[6].date)} · Horário de Brasília · Hoje não incluído.
      <span className="mt-1 block">{total.toLocaleString('pt-BR')} ocorrências no período · Média diária de {(total / 7).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}.</span>
    </figcaption>
    <div aria-hidden="true" className="mt-4 grid grid-cols-7 gap-2">
      {series.map(day => <div key={day.date} className="min-w-0 text-center text-xs">
        <div className="flex h-32 flex-col items-center justify-end gap-1">
          <span className="font-semibold tabular-nums">{day.count.toLocaleString('pt-BR')}</span>
          <div className="w-full max-w-8 rounded-t bg-brand-primary" style={{ height: `${day.count / maximum * 90}px` }} />
        </div>
        <span className="mt-2 block text-ink-secondary">{label(day.date)}</span>
      </div>)}
    </div>
    {total === 0 && <p className="mt-3 text-xs text-ink-secondary">Nenhuma ocorrência registrada neste período.</p>}
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer font-semibold text-brand-primary">Ver dados em tabela</summary>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">Contagem diária de ocorrências — horário de Brasília</caption>
        <thead><tr><th scope="col">Data</th><th scope="col">Ocorrências</th></tr></thead>
        <tbody>{series.map(day => <tr key={day.date}><th scope="row" className="font-normal"><time dateTime={day.date}>{label(day.date)}/{day.date.slice(0, 4)}</time></th><td>{day.count}</td></tr>)}</tbody>
      </table>
    </details>
  </figure>;
}
