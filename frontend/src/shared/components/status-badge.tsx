import type { OccurrenceStatus } from '@/shared/types/api';

const statuses: Record<OccurrenceStatus, { label: string; className: string }> = {
  RECEIVED: { label: 'Recebido', className: 'bg-slate-100 text-slate-700' },
  UNDER_ANALYSIS: { label: 'Em análise', className: 'bg-amber-50 text-amber-800' },
  CONFIRMED: { label: 'Confirmado', className: 'bg-blue-50 text-blue-700' },
  IN_SERVICE: { label: 'Em atendimento', className: 'bg-orange-50 text-orange-700' },
  RESOLVED: { label: 'Resolvido', className: 'bg-green-50 text-green-700' },
  REJECTED: { label: 'Rejeitado', className: 'bg-red-50 text-red-700' },
};

export function StatusBadge({ status }: { status: OccurrenceStatus }) {
  const item = statuses[status];
  return (
    <span className={'inline-flex rounded-full px-3 py-1 text-xs font-semibold ' + item.className}>
      {item.label}
    </span>
  );
}
