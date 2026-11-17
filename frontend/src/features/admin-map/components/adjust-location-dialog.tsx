import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, Crosshair, X } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { type AdminMapOccurrence, type GeoPoint } from '../services/admin-occurrences.service';
import { formatCoords, validPoint } from '../services/map-presentation';
import { AdjustmentLeafletMap } from './admin-leaflet-map';

interface AdjustLocationDialogProps {
  item: AdminMapOccurrence | null;
  position: GeoPoint | null;
  canUseMap: boolean;
  onTileError: () => void;
  confirming: boolean;
  error: string | null;
  isSaving: boolean;
  onSetPosition: (point: GeoPoint) => void;
  onCancel: () => void;
  onRequestConfirmation: () => void;
  onReturnToEdit: () => void;
  onSave: () => void;
}

export function AdjustLocationDialog({
  item, position, canUseMap, onTileError, confirming,
  error, isSaving, onSetPosition,
  onCancel, onRequestConfirmation, onReturnToEdit, onSave,
}: AdjustLocationDialogProps) {
  return (
    <Dialog.Root open={item !== null} onOpenChange={(open) => { if (!open && !isSaving) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[min(95vw,580px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="text-xl font-bold text-ink-primary">
              {confirming ? 'Confirmar ajuste de localização' : 'Ajustar localização'}
            </Dialog.Title>
            <Dialog.Close asChild disabled={isSaving}>
              <button type="button" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Fechar ajuste"><X aria-hidden="true" size={20} /></button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-sm text-ink-secondary">
            A posição original permanecerá preservada no banco e no histórico de auditoria.
          </Dialog.Description>
          {item && position && (
            <>
              <div className="mt-4 rounded-lg bg-surface-page p-3 text-sm">
                <p className="font-semibold">{item.category.name}</p>
                <p className="mt-1 text-ink-secondary">Posição atualmente exibida: {formatCoords(item.location)}</p>
              </div>

              {confirming ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950">
                    <AlertTriangle className="mb-2" size={20} aria-hidden="true" />
                    <p>Deseja realmente registrar esta correção geográfica?</p>
                    <p className="mt-2 font-semibold">Nova localização: {formatCoords(position)}</p>
                    <p className="mt-2">A mudança será atribuída ao administrador pelo backend.</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-3">
                    <Button variant="outline" type="button" disabled={isSaving} onClick={onReturnToEdit}>Voltar</Button>
                    <Button type="button" isLoading={isSaving} onClick={onSave}>Confirmar ajuste</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-5">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Crosshair size={17} aria-hidden="true" /> Arraste o marcador ou selecione coordenadas.
                  </p>
                  {canUseMap ? (
                    <div className="h-[240px] overflow-hidden rounded-xl border border-line" aria-label="Mapa de correção da localização">
                      <AdjustmentLeafletMap key={item.id} position={position} onChange={onSetPosition} onTileError={onTileError} />
                    </div>
                  ) : (
                    <p className="rounded-lg bg-surface-info p-3 text-xs text-brand-primary">
                      Mapa indisponível: ajuste as coordenadas manualmente.
                    </p>
                  )}
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="field-label" htmlFor="location-latitude">
                      Latitude
                      <input id="location-latitude" className="field-input mt-2" type="number"
                        step="any" min="-90" max="90" value={position.lat}
                        onChange={(event) => onSetPosition({ ...position, lat: event.target.valueAsNumber })} />
                    </label>
                    <label className="field-label" htmlFor="location-longitude">
                      Longitude
                      <input id="location-longitude" className="field-input mt-2" type="number"
                        step="any" min="-180" max="180" value={position.lng}
                        onChange={(event) => onSetPosition({ ...position, lng: event.target.valueAsNumber })} />
                    </label>
                  </div>
                  <div className="mt-5 flex flex-wrap justify-end gap-3">
                    <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                    <Button type="button" onClick={onRequestConfirmation}
                      disabled={!validPoint(position) || (position.lat === item.location.lat && position.lng === item.location.lng)}>
                      Salvar posição
                    </Button>
                  </div>
                </div>
              )}
              {error && (
                <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>
              )}
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
