import { Link } from 'react-router-dom';
import { MapPinOff, RefreshCw } from 'lucide-react';
import { StatusBadge } from '@/shared/components/status-badge';
import { type AdminMapOccurrence, isActiveStatus } from '../services/admin-occurrences.service';
import { formatCoords, safeDescription, shortOccurrenceId } from '../services/map-presentation';
import { useMapListPagination } from '../view-models/use-map-list-pagination';

interface TextFallbackProps {
  items: AdminMapOccurrence[];
  onAdjust: (item: AdminMapOccurrence) => void;
  reason: string;
  onRetryMap?: () => void;
}

export function AdminMapTextFallback({ items, onAdjust, reason, onRetryMap }: TextFallbackProps) {
  const pagination = useMapListPagination(items.length);
  return (
    <section aria-label="Ocorrências em formato de lista" className="space-y-3 p-4 md:px-6">
      <div role="status" className="flex items-start gap-3 rounded-lg bg-surface-info p-3 text-xs text-brand-primary">
        <MapPinOff size={20} aria-hidden="true" className="shrink-0" />
        <p>{reason} Consulte os registros abaixo ou abra os detalhes para ver a descrição completa.</p>
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
        <ul className="grid gap-3 xl:grid-cols-2" aria-label="Ocorrências ativas">
          {items.slice(pagination.start, pagination.end).map((item) => (
            <li key={item.id} className="min-w-0 rounded-xl border border-line bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-sm">{item.category.name}</strong>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-ink-secondary" title={safeDescription(item)}>{safeDescription(item)}</p>
              <p className="mt-2 text-xs text-ink-secondary">
                Ocorrência {shortOccurrenceId(item.id)} — Coordenadas: {formatCoords(item.location)}
              </p>
              <div className="mt-2 flex flex-wrap gap-4 text-xs">
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
      {items.length > 0 && <footer className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <p aria-live="polite">{pagination.start + 1}–{pagination.end} de {items.length} ocorrências carregadas</p>
        <nav aria-label="Paginação das ocorrências do mapa" className="flex items-center gap-3">
          <button type="button" className="min-h-9 rounded-lg border border-line bg-white px-3 font-semibold text-brand-primary disabled:opacity-40" disabled={pagination.page === 1} onClick={() => pagination.setPage(pagination.page - 1)}>Anterior</button>
          <span>Página {pagination.page} de {pagination.totalPages}</span>
          <button type="button" className="min-h-9 rounded-lg border border-line bg-white px-3 font-semibold text-brand-primary disabled:opacity-40" disabled={pagination.page === pagination.totalPages} onClick={() => pagination.setPage(pagination.page + 1)}>Próxima</button>
        </nav>
      </footer>}
    </section>
  );
}
