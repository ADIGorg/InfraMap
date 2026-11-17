/**
 * RN041: backend persiste UTC; exibição em America/Sao_Paulo.
 * Formato: dd/MM/yyyy
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    // Fallback caso Hermes não tenha tz data completa
    const local = new Date(date.getTime() - 3 * 60 * 60 * 1000);
    const day = String(local.getUTCDate()).padStart(2, '0');
    const month = String(local.getUTCMonth() + 1).padStart(2, '0');
    const year = local.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
}

/** dd/MM/yyyy HH:mm */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    const local = new Date(date.getTime() - 3 * 60 * 60 * 1000);
    const day = String(local.getUTCDate()).padStart(2, '0');
    const month = String(local.getUTCMonth() + 1).padStart(2, '0');
    const year = local.getUTCFullYear();
    const hour = String(local.getUTCHours()).padStart(2, '0');
    const min = String(local.getUTCMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hour}:${min}`;
  }
}