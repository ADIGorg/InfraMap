import { useCallback, useState } from 'react';
import { List, MapPinned, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { AdminLeafletMap } from '../components/admin-leaflet-map';
import { AdminMapFilters } from '../components/admin-map-filters';
import { AdminMapTextFallback } from '../components/admin-map-text-fallback';
import { AdjustLocationDialog } from '../components/adjust-location-dialog';
import { useAdminMapViewModel, describeMapMutationError } from '../view-models/use-admin-map-view-model';

export function AdminMapPage() {
  const vm = useAdminMapViewModel();
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const [showList, setShowList] = useState(false);
  const onTileError = useCallback(() => setTilesUnavailable(true), []);
  const mapAvailable = !tilesUnavailable;
  const items = vm.occurrences.data ?? [];

  const panel = (
    <div className="relative min-h-[450px] flex-1 lg:min-h-[650px]">
      {vm.occurrences.isPending ? (
        <div role="status" className="flex h-full min-h-[450px] items-center justify-center p-8 text-sm text-ink-secondary">
          Carregando ocorrências ativas…
        </div>
      ) : vm.occurrences.isError ? (
        <div role="alert" className="flex h-full min-h-[450px] flex-col items-center justify-center gap-3 p-8">
          <p className="max-w-md text-center text-red-800">
            Não foi possível consultar as ocorrências. Nenhum marcador ou registro fictício foi criado.
          </p>
          <Button variant="outline" type="button" onClick={() => void vm.occurrences.refetch()}>Tentar novamente</Button>
        </div>
      ) : mapAvailable && !showList ? (
        <>
          {items.length > 0 && (
            <div role="note" className="pointer-events-none absolute left-16 right-3 top-3 z-10 ml-auto w-fit max-w-xs rounded-lg bg-brand-primary px-3 py-2 text-xs font-semibold text-white shadow-lg">
              Selecione um marcador para ver o resumo e ajustar a posição.
            </div>
          )}
          <div className="h-[550px] lg:h-[700px]" aria-label="Mapa administrativo de ocorrências">
            <AdminLeafletMap
              items={items}
              selected={vm.selected}
              onSelect={vm.selectOccurrence}
              onAdjust={vm.startAdjustment}
              onAreaChanged={vm.setAvailableBounds}
              onTileError={onTileError}
            />
          </div>
          {items.length === 0 && (
            <p role="status" className="border-t border-line bg-white p-3 text-sm text-ink-secondary">
              Nenhuma ocorrência ativa corresponde aos filtros.
            </p>
          )}
        </>
      ) : (
        <AdminMapTextFallback
          items={items}
          onAdjust={vm.startAdjustment}
          reason={tilesUnavailable
            ? 'O serviço de mapas OpenStreetMap não está disponível.'
            : 'Visualização em lista selecionada.'}
          onRetryMap={tilesUnavailable ? () => setTilesUnavailable(false) : undefined}
        />
      )}
    </div>
  );

  return (
    <div className="w-full">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-white px-4 py-5 md:px-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-primary">
            <MapPinned size={25} aria-hidden="true" />
            Mapa Administrativo
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Ocorrências ativas, filtros suportados e correção auditável de coordenadas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mapAvailable && (
            <Button variant="outline" type="button" onClick={() => setShowList((value) => !value)}
              aria-pressed={showList}>
              <List size={16} aria-hidden="true" />
              {showList ? 'Ver mapa' : 'Visualizar em lista'}
            </Button>
          )}
          <Button variant="outline" type="button" onClick={() => void vm.occurrences.refetch()}
            isLoading={vm.occurrences.isFetching}>
            <RefreshCw size={16} aria-hidden="true" /> Atualizar ocorrências
          </Button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {panel}
        <AdminMapFilters
          draft={vm.draft}
          appliedBounds={vm.applied.bbox}
          categories={vm.categories.data}
          categoriesLoading={vm.categories.isPending}
          categoriesError={vm.categories.isError}
          canSearchArea={mapAvailable && !showList && vm.availableBounds !== null}
          error={vm.adjusting ? null : vm.inputError}
          onStatusChange={vm.updateStatus}
          onCategoryChange={vm.setCategory}
          onApply={vm.applyFilters}
          onClear={vm.clearFilters}
          onSearchArea={vm.searchVisibleArea}
          onClearArea={vm.clearArea}
        />
      </div>

      <AdjustLocationDialog
        item={vm.adjusting}
        position={vm.candidate}
        canUseMap={mapAvailable}
        onTileError={onTileError}
        confirming={vm.confirming}
        isSaving={vm.mutation.isPending}
        error={vm.mutation.error
          ? describeMapMutationError(vm.mutation.error) : vm.inputError}
        onSetPosition={vm.setCandidate}
        onCancel={vm.cancelAdjustment}
        onRequestConfirmation={vm.requestConfirmation}
        onReturnToEdit={() => vm.setConfirming(false)}
        onSave={vm.saveAdjustment}
      />

      {!vm.occurrences.isPending && !vm.occurrences.isError && (
        <p className="border-t border-line bg-white px-5 py-3 text-xs text-ink-secondary">
          {items.length.toLocaleString('pt-BR')} ocorrências ativas retornadas pela API, considerando os filtros aplicados.
          O mapa não exibe ocorrências resolvidas ou rejeitadas.
        </p>
      )}
    </div>
  );
}
