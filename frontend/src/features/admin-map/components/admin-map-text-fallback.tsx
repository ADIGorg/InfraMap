import { Link } from 'react-router-dom';
import { MapPinOff, RefreshCw } from 'lucide-react';
import { StatusBadge } from '@/shared/components/status-badge';
import { type AdminMapOccurrence, isActiveStatus } from '../services/admin-occurrences.service';
import { formatCoords, safeDescription, shortOccurrenceId } from '../services/map-presentation';

interface TextFallbackProps {
  items: AdminMapOccurrence[];
  onAdjust: (item: AdminMapOccurrence) => void;
  reason: string;
  onRetryMap?: () => void;
}

export function AdminMapTextFallback({ items, onAdjust, reason, onRetryMap }: TextFallbackProps) {
  return (
    <section aria-label="Ocorrências em formato de lista" className="space-y-4 rounded-xl bg-white p-5">
      <div role="status" className="flex items-start gap-3 rounded-lg bg-surface-info p-4 text-sm text-brand-primary">
        <MapPinOff size={20} aria-hidden="true" className="shrink-0" />
        <p>{reason} As ocorrências continuam acessíveis abaixo, com coordenadas textuais.</p>
      </div>
      {onRetryMap && (
        <button
          type="button"
          onClick={onRetryMap}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-brand-primary hover:bg-surface-page"
        >
          <RefreshCw size={16} aria-hidden="true" />
          Tentar carregar o mapa novamente
        </button>
      )}
      {items.length === 0 ? (
        <p role="status" className="py-8 text-sm text-ink-secondary">Nenhuma ocorrência ativa corresponde aos filtros.</p>
      ) : (
        <ul className="max-h-[620px] space-y-3 overflow-y-auto" aria-label="Ocorrências ativas">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-sm">{item.category.name}</strong>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-2 text-sm text-ink-secondary">{safeDescription(item)}</p>
              <p className="mt-2 text-xs text-ink-secondary">
                Ocorrência {shortOccurrenceId(item.id)} — Coordenadas: {formatCoords(item.location)}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <Link to={'/admin/occurrences/' + item.id}
                  className="font-semibold text-brand-primary underline">Ver detalhes</Link>
                {isActiveStatus(item.status) && (
                  <button type="button" onClick={() => onAdjust(item)}
                    className="font-semibold text-brand-primary underline">Ajustar posição</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
