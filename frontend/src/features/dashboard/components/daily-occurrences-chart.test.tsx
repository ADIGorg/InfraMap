import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { DailyOccurrencesChart } from './daily-occurrences-chart';

const series = ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']
  .map((date, index) => ({ date, count: index === 4 ? 14 : 0 }));
describe('Série diária real', () => {
  it('alterna tabela e barras usando os mesmos valores, sem empilhar os dois', () => {
    render(<DailyOccurrencesChart series={series} pending={false} error={false} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver dados em tabela' }));
    expect(screen.getByRole('table')).toBeVisible();
    expect(within(screen.getByRole('table')).getByText('14')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver gráfico de barras' }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
  it('exibe sete dias, zeros e média da série, preservando calendário na virada do ano', () => {
    render(<DailyOccurrencesChart series={series} pending={false} error={false} />);
    const table = screen.getByRole('table', { hidden: true });
    expect(within(table).getAllByRole('row', { hidden: true })).toHaveLength(8);
    expect(within(table).getByText('01/01/2027')).toBeInTheDocument();
    expect(within(table).getAllByText('0')).toHaveLength(6);
    expect(screen.getByText(/14 ocorrências no período · Média diária de 2/)).toBeInTheDocument();
  });
  it('mostra sete zeros somente quando enviados pela API', () => {
    render(<DailyOccurrencesChart series={series.map(day => ({ ...day, count: 0 }))} pending={false} error={false} />);
    expect(screen.getByText('Nenhuma ocorrência registrada neste período.')).toBeInTheDocument();
  });
  it.each([{ pending: true, error: false }, { pending: false, error: true }, { pending: false, error: false }])(
    'não inventa contagens quando não há série disponível: %j', state => {
      render(<DailyOccurrencesChart {...state} />);
      expect(screen.queryByRole('table', { hidden: true })).not.toBeInTheDocument();
      expect(screen.queryByText('Nenhuma ocorrência registrada neste período.')).not.toBeInTheDocument();
    },
  );
});
