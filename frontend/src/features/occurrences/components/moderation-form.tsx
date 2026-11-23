import { useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/shared/components/button';
import { Select } from '@/shared/components/select';
import { OccurrenceAddress } from '@/shared/components/occurrence-address';
import { AdjustmentLeafletMap } from '@/features/admin-map/components/admin-leaflet-map';
import { validPoint } from '@/features/admin-map/services/map-presentation';
import { actionLabels, actionSchemas, type ModerationAction, type ModerationRequest } from '../services/detail-moderation.service';
import type { OccurrenceDetail } from '../services/occurrence-detail.service';

interface Props {
  action: ModerationAction;
  detail: OccurrenceDetail;
  categories: Array<{ id: string; name: string }>;
  pending: boolean;
  message: string;
  onClose: () => void;
  onSubmit: (request: ModerationRequest) => Promise<boolean>;
}
export function ModerationForm({ action, detail, categories, pending, message, onClose, onSubmit }: Props) {
  const [error, setError] = useState('');
  const [request, setRequest] = useState<ModerationRequest | null>(null);
  const [position, setPosition] = useState({ ...detail.location });
  const [confirmLocation, setConfirmLocation] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const [resolutionDraft, setResolutionDraft] = useState('');
  const [agencyResponse, setAgencyResponse] = useState('');
  const [justification, setJustification] = useState('');
  const closingService = action === 'reject' && detail.status === 'IN_SERVICE';
  const requiresAgencyResponse = action === 'reject' && detail.status === 'CONFIRMED';
  const reviewLabel = closingService ? 'Revisar encerramento' : 'Revisar rejeição';
  const rejectLabel = closingService ? 'Confirmar encerramento' : 'Sim, rejeitar';
  const rejectingLabel = closingService ? 'Registrando encerramento…' : 'Registrando rejeição…';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (typeof values.agencyResponse === 'string') values.agencyResponse = values.agencyResponse.trim();
    const body = action === 'location' ? position : Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ''));
    const result = actionSchemas[action].safeParse(body);
    if (!result.success) { setError(result.error.issues.map(issue => issue.message).join(' ')); return; }
    if (requiresAgencyResponse && !('agencyResponse' in result.data && result.data.agencyResponse)) {
      setError('Registre a resposta do órgão responsável.'); return;
    }
    if (action === 'location') {
      if (!validPoint(position)) { setError('Coordenadas inválidas.'); return; }
      if (position.lat === detail.location.lat && position.lng === detail.location.lng) {
        setError('Escolha uma posição diferente da atual.'); return;
      }
      setError(''); setConfirmLocation(true); return;
    }
    setError('');
    const next = { action, body: result.data } as ModerationRequest;
    if (action === 'reject' || action === 'resolve') { setRequest(next); return; }
    if (await onSubmit(next)) onClose();
  }
  async function confirmLocationChange() {
    const result = actionSchemas.location.safeParse(position);
    if (!result.success) { setError('Coordenadas inválidas.'); setConfirmLocation(false); return; }
    if (await onSubmit({ action: 'location', body: result.data })) onClose();
  }
  async function confirmReviewedAction() {
    if (request && await onSubmit(request)) onClose();
  }
  const textField = { reject: ['justification', 'Justificativa'], 'start-service': ['actionNotes', 'Ação concreta do atendimento'], resolve: ['resolutionNotes', 'Notas de resolução'] }[action as 'reject' | 'start-service' | 'resolve'];
  return <Dialog.Root open onOpenChange={open => { if (!open && !pending) onClose(); }}>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl focus-visible:outline-none">
        <Dialog.Title className="text-xl font-bold">{closingService ? 'Encerrar sem resolução' : actionLabels[action]}</Dialog.Title>
        <Dialog.Description className="my-3 text-sm text-ink-secondary">Revise os dados antes de confirmar a alteração.</Dialog.Description>
        {message && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{message}</p>}
        {confirmLocation ? <div className="space-y-3">
          <p>Confirma o ajuste de localização? A posição original será preservada no histórico.</p>
          <p className="font-semibold">{position.lat.toFixed(6)}, {position.lng.toFixed(6)}</p>
          <div className="flex gap-3"><Button variant="outline" disabled={pending} onClick={() => setConfirmLocation(false)}>Voltar</Button>
            <Button isLoading={pending} onClick={() => void confirmLocationChange()}>Confirmar ajuste</Button></div>
        </div> : request ? <div className="space-y-4">
          {request.action === 'resolve' ? <>
            <p>Confirma que o atendimento foi concluído e que a ocorrência deve passar para <strong>Resolvida</strong>?</p>
            <div className="rounded-lg bg-surface-page p-3">
              <p className="text-sm font-semibold">Registro da resolução</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm">{request.body.resolutionNotes}</p>
            </div>
            <p className="text-sm text-ink-secondary">A conclusão será registrada no histórico e comunicada ao cidadão. Confira as informações antes de confirmar.</p>
          </> : request.action === 'reject' && <>
            <p>{closingService ? 'A ocorrência será encerrada sem resolução e o cidadão será informado.' : 'Confirmar a rejeição? A ocorrência será encerrada e o cidadão será informado.'}</p>
            <p className="whitespace-pre-wrap break-words text-sm">Justificativa: {request.body.justification}</p>
            {request.body.agencyResponse && <p className="whitespace-pre-wrap break-words text-sm">Resposta do órgão: {request.body.agencyResponse}</p>}
          </>}
          <div className="flex gap-3"><Button variant="outline" disabled={pending} onClick={() => setRequest(null)}>Voltar</Button>
            <Button variant={request.action === 'reject' ? 'danger' : 'primary'} isLoading={pending} onClick={() => void confirmReviewedAction()}>
              {request.action === 'resolve' ? 'Confirmar resolução' : pending ? rejectingLabel : rejectLabel}
            </Button></div>
        </div> : <form onSubmit={event => void submit(event)} className="space-y-4">
          {textField && <label className="field-label">{textField[1]}<textarea className="field-input mt-2" name={textField[0]} required minLength={10} maxLength={2000} rows={5}
            value={action === 'resolve' ? resolutionDraft : action === 'reject' ? justification : undefined}
            onChange={action === 'resolve' ? event => setResolutionDraft(event.target.value) : action === 'reject' ? event => setJustification(event.target.value) : undefined} /></label>}
          {(requiresAgencyResponse || closingService) && <label className="field-label">Resposta do órgão responsável{closingService ? ' (opcional)' : ''}
            <textarea className="field-input mt-2" name="agencyResponse" required={requiresAgencyResponse} minLength={10} maxLength={2000} rows={4}
              value={agencyResponse} onChange={event => setAgencyResponse(event.target.value)} />
          </label>}
          {action === 'start-service' && <label className="flex items-start gap-2 text-sm"><input type="checkbox" required />O órgão responsável aceitou atender e a ação concreta foi definida.</label>}
          {action === 'priority' && <label className="field-label">Prioridade<Select className="mt-2" name="priority" defaultValue={detail.priority ?? 'MEDIUM'} options={[{ value: 'LOW', label: 'Baixa' }, { value: 'MEDIUM', label: 'Média' }, { value: 'HIGH', label: 'Alta' }]} /></label>}
          {action === 'location' && <>
            <div className="rounded-lg bg-surface-page p-3 text-sm">
              <h3 className="font-semibold">Posição atual</h3>
              <div className="mt-1 break-words leading-relaxed">
                <OccurrenceAddress point={detail.location} />
              </div>
            </div>
            {!mapUnavailable && <div className="h-[240px] overflow-hidden rounded-xl border border-line" aria-label="Mapa de correção da localização">
              <AdjustmentLeafletMap position={position} onChange={setPosition} onTileError={() => setMapUnavailable(true)} />
            </div>}
            {mapUnavailable && <p className="text-sm text-ink-secondary">Mapa indisponível. Edite as coordenadas manualmente.</p>}
            <div className="grid grid-cols-2 gap-3">
              <label className="field-label">Latitude<input className="field-input" type="number" name="lat" required step="any" min="-90" max="90" value={Number.isFinite(position.lat) ? position.lat : ''} onChange={e => setPosition(old => ({ ...old, lat: e.target.value === '' ? NaN : Number(e.target.value) }))} /></label>
              <label className="field-label">Longitude<input className="field-input" type="number" name="lng" required step="any" min="-180" max="180" value={Number.isFinite(position.lng) ? position.lng : ''} onChange={e => setPosition(old => ({ ...old, lng: e.target.value === '' ? NaN : Number(e.target.value) }))} /></label>
            </div>
            <p className="text-xs text-ink-secondary">Arraste o marcador, clique no mapa ou edite as coordenadas.</p>
          </>}
          {action === 'classification' && <>
            <label className="field-label">Categoria<Select name="categoryId" defaultValue="" options={[{ value: '', label: 'Manter categoria' }, ...categories.map(category => ({ value: category.id, label: category.name }))]} /></label>
            <label className="field-label">Descrição corrigida<textarea name="description" className="field-input" maxLength={500} rows={5} placeholder="Preencha para alterar a descrição" /></label>
          </>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancelar</Button>
            <Button type="submit" isLoading={pending}>{action === 'reject' ? reviewLabel : action === 'resolve' ? 'Revisar resolução' : action === 'location' ? 'Salvar posição' : 'Confirmar'}</Button></div>
        </form>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

