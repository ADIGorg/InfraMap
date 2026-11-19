import { useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/shared/components/button';
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
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const body = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ''));
    const result = actionSchemas[action].safeParse(body);
    if (!result.success) { setError(result.error.issues.map(issue => issue.message).join(' ')); return; }
    setError('');
    const next = { action, body: result.data } as ModerationRequest;
    if (action === 'reject') { setRequest(next); return; }
    if (await onSubmit(next)) onClose();
  }
  async function confirmRejection() {
    if (request && await onSubmit(request)) onClose();
    else setRequest(null);
  }
  const textField = { reject: ['justification', 'Justificativa'], 'start-service': ['actionNotes', 'Ação concreta do atendimento'], resolve: ['resolutionNotes', 'Notas de resolução'] }[action as 'reject' | 'start-service' | 'resolve'];
  return <Dialog.Root open onOpenChange={open => { if (!open && !pending) onClose(); }}>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <Dialog.Title className="text-xl font-bold">{actionLabels[action]}</Dialog.Title>
        <Dialog.Description className="my-3 text-sm text-ink-secondary">Revise os dados antes de confirmar a alteração.</Dialog.Description>
        {message && <p role="alert" className="mb-4 text-sm">{message}</p>}
        {request ? <div>
          <p className="mb-4 whitespace-pre-wrap">{'justification' in request.body ? request.body.justification : ''}</p>
          <p className="mb-4">Confirmar a rejeição? A ocorrência será encerrada.</p>
          <div className="flex gap-3"><Button variant="outline" disabled={pending} onClick={() => setRequest(null)}>Voltar</Button>
            <Button variant="danger" isLoading={pending} onClick={() => void confirmRejection()}>Sim, rejeitar</Button></div>
        </div> : <form onSubmit={event => void submit(event)} className="space-y-4">
          {textField && <label className="field-label">{textField[1]}<textarea className="field-input mt-2" name={textField[0]} required={action !== 'resolve'} minLength={action === 'resolve' ? undefined : 10} maxLength={2000} rows={5} /></label>}
          {action === 'start-service' && <label className="flex items-start gap-2 text-sm"><input type="checkbox" required />O órgão responsável aceitou atender e a ação concreta foi definida.</label>}
          {action === 'priority' && <label className="field-label">Prioridade<select className="field-input mt-2" name="priority" defaultValue={detail.priority ?? 'MEDIUM'}><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option></select></label>}
          {action === 'location' && <div className="grid grid-cols-2 gap-3">
            <label className="field-label">Latitude<input className="field-input" type="number" name="lat" required step="any" min="-90" max="90" defaultValue={detail.location.lat} /></label>
            <label className="field-label">Longitude<input className="field-input" type="number" name="lng" required step="any" min="-180" max="180" defaultValue={detail.location.lng} /></label>
          </div>}
          {action === 'classification' && <>
            <label className="field-label">Categoria<select name="categoryId" className="field-input" defaultValue=""><option value="">Manter categoria</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label className="field-label">Descrição corrigida<textarea name="description" className="field-input" maxLength={500} rows={5} placeholder="Preencha para alterar a descrição" /></label>
          </>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancelar</Button>
            <Button type="submit" isLoading={pending}>{action === 'reject' ? 'Revisar rejeição' : 'Confirmar'}</Button></div>
        </form>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

