import { AlertTriangle, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/utils/cn';
import type { AdminAlert } from '../services/admin-notifications.service';
import { formatAlertDate } from '../utils/format-alert-date';

export function AdminAlertList({ alerts, isViewed, onView }: {
  alerts: AdminAlert[]; isViewed: (alert: AdminAlert) => boolean; onView: (alert: AdminAlert) => void;
}) {
  return <ul aria-label="Alertas administrativos" className="divide-y divide-line-subtle">
    {alerts.map(alert => {
      const viewed = isViewed(alert);
      const Icon = alert.kind === 'sla' ? AlertTriangle : Plus;
      return <li key={alert.id} className={cn('px-5 py-4', !viewed && 'bg-surface-info')}>
        <Link to={alert.to} onClick={() => onView(alert)} className="flex gap-4 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary">
          <Icon className="mt-1 shrink-0 text-brand-primary" size={20} aria-hidden="true" />
          <div className="min-w-0">
            <p className={cn('text-sm text-ink-primary', !viewed && 'font-semibold')}>{alert.title}</p>
            {alert.date && <p className="mt-1 text-xs text-ink-secondary">Registrada em <time dateTime={alert.date}>{formatAlertDate(alert.date)}</time></p>}
            {alert.kind === 'sla' && <p className="mt-1 text-xs text-ink-secondary">Contagem atual de prazo excedido. Abrir lista por status; ela também inclui ocorrências dentro do prazo.</p>}
            <p className="mt-1 text-xs text-ink-secondary">{viewed ? 'Visualizada nesta sessão' : 'Não visualizada nesta sessão'}</p>
          </div>
        </Link>
      </li>;
    })}
  </ul>;
}
