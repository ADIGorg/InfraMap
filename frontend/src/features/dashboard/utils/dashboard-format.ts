export function formatElapsedDays(days: number | null): string {
  if (days === null) return 'Sem resoluções';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(days) + ' dias';
}

export function formatOccurrenceDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}
