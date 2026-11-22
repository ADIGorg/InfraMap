import { useCallback, useState } from 'react';
import { List, MapPinned, RefreshCw, SlidersHorizontal, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/shared/components/button';
import { AdminLeafletMap } from '../components/admin-leaflet-map';
import { AdminMapFilters } from '../components/admin-map-filters';
import { AppliedMapFilters } from '../components/applied-map-filters';
import { AdminMapTextFallback } from '../components/admin-map-text-fallback';
import { AdjustLocationDialog } from '../components/adjust-location-dialog';
import { useAdminMapViewModel, describeMapMutationError } from '../view-models/use-admin-map-view-model';

export function AdminMapPage() {
  const vm = useAdminMapViewModel();
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const [showList, setShowList] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const onTileError = useCallback(() => setTilesUnavailable(true), []);
  const mapAvailable = !tilesUnavailable;
  const listMode = showList || tilesUnavailable;
  const items = vm.occurrences.data ?? [];
  const filterCount = Number(!!vm.applied.q) + Number(!!vm.applied.categoryId)
    + Number(vm.applied.statuses.length !== 4) + Number(!!vm.applied.priority)
    + Number(!!vm.applied.neighborhoodId) + Number(!!(vm.applied.createdFrom || vm.applied.createdBefore))
    + Number(!!vm.applied.bbox);

  const panel = (
    <div className={
      'relative flex min-h-[450px] min-w-0 flex-1 flex-col lg:min-h-0 ' +
      (listMode ? '' : 'lg:overflow-hidden')
    }>
      {vm.occurrences.isPending ? (
        <div role="status" className="flex h-full min-h-[450px] items-center justify-center p-8 text-sm text-ink-secondary lg:min-h-0">
          Carregando ocorrências ativas…
        </div>
      ) : vm.occurrences.isError ? (
        <div role="alert" className="flex h-full min-h-[450px] flex-col items-center justify-center gap-3 p-8 lg:min-h-0">
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
          <div className="h-[550px] lg:h-auto lg:min-h-0 lg:flex-1" aria-label="Mapa administrativo de ocorrências">
            <AdminLeafletMap
              items={items}
              viewport={vm.viewport}
              onViewportChanged={vm.setViewport}
              selected={vm.selected}
              onSelect={vm.selectOccurrence}
              onAdjust={vm.startAdjustment}
              onAreaChanged={vm.setAvailableBounds}
              onTileError={onTileError}
            />
          </div>
          {items.length === 0 && (
            <p role="status" className="shrink-0 border-t border-line bg-white p-3 text-sm text-ink-secondary">
              Nenhuma ocorrência ativa corresponde aos filtros.
            </p>
          )}
        </>
      ) : (
        <AdminMapTextFallback
          key={JSON.stringify(vm.applied)}
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
    <div className={listMode ? 'flex min-h-[calc(100dvh-72px)] w-full flex-col' : 'w-full lg:flex lg:h-[calc(100dvh-72px)] lg:min-h-0 lg:flex-col lg:overflow-hidden'}>
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-line bg-white px-4 py-5 md:px-8">
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
          <Button variant="outline" type="button" onClick={() => setShowFilters(true)} aria-haspopup="dialog" aria-expanded={showFilters}>
            <SlidersHorizontal size={16} aria-hidden="true" /> Filtros{filterCount > 0 ? ` (${filterCount})` : ''}
          </Button>
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

      <AppliedMapFilters filters={vm.applied} categories={vm.categories.data} onApply={vm.applyMapFilters} onClear={vm.clearFilters} />

      <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row">
        {panel}
      </div>

      <Dialog.Root open={showFilters} onOpenChange={setShowFilters}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col overflow-hidden bg-white shadow-xl focus-visible:outline-none">
            <div className="flex shrink-0 items-center justify-between border-b border-line bg-white px-5 py-3">
              <Dialog.Title className="font-bold text-brand-primary">Filtros do mapa</Dialog.Title>
              <Dialog.Close asChild><button type="button" aria-label="Fechar filtros" className="rounded-lg p-2 text-brand-primary hover:bg-surface-info"><X size={20} /></button></Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">Refine as ocorrências exibidas no mapa e na lista.</Dialog.Description>
            <AdminMapFilters
          initial={vm.applied}
          visibleBounds={mapAvailable && !showList ? vm.availableBounds : null}
          categories={vm.categories.data}
          categoriesLoading={vm.categories.isPending}
          categoriesError={vm.categories.isError}
          canSearchArea={mapAvailable && !showList && vm.availableBounds !== null}
          onApply={filters => {
            vm.applyMapFilters(filters);
            setShowFilters(false);
          }}
          onClear={vm.clearFilters}
        />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

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
        <p className="shrink-0 border-t border-line bg-white px-5 py-3 text-xs text-ink-secondary">
          {items.length.toLocaleString('pt-BR')} ocorrências ativas retornadas pela API, considerando os filtros aplicados.
          O mapa não exibe ocorrências resolvidas ou rejeitadas.
        </p>
      )}
    </div>
  );
}
