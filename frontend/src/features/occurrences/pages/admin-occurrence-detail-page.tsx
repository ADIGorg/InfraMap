import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/shared/components/button';
import { StatusBadge } from '@/shared/components/status-badge';
import { safeErrorMessage } from '@/shared/errors/app-error';
import { useAdminOccurrenceDetailViewModel } from '../view-models/use-admin-occurrence-detail-view-model';
import { actionLabels, allowedActions, type ModerationAction } from '../services/detail-moderation.service';
import { forwardingInputSchema } from '../services/forwardings.service';
import { ModerationForm } from '../components/moderation-form';

const date = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
}).format(new Date(value));
const panel = 'rounded-2xl border border-line-subtle bg-white p-6';
const priorities = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta' };
const historyLabels: Record<string, string> = {
  CREATED: 'Ocorrência registrada', STATUS_CHANGED: 'Status alterado', PRIORITY_CHANGED: 'Prioridade alterada',
  LOCATION_ADJUSTED: 'Localização ajustada', CLASSIFICATION_CORRECTED: 'Classificação corrigida',
  OBSERVATION_CREATED: 'Observação registrada', FORWARDED_TO_AGENCY: 'Encaminhada ao órgão',
  FORWARDING_SENT: 'Encaminhamento enviado', FORWARDING_FAILED: 'Falha no encaminhamento',
};
export function AdminOccurrenceDetailPage() {
  const { id = '' } = useParams();
  return <DetailContent key={id} id={id} />;
}
function DetailContent({ id }: { id: string }) {
  const vm = useAdminOccurrenceDetailViewModel(id);
  const [action, setAction] = useState<ModerationAction | null>(null);
  const [agency, setAgency] = useState('');
  const [forwardNotes, setForwardNotes] = useState('');
  const [forwardError, setForwardError] = useState('');
  const [failedPhotos, setFailedPhotos] = useState<string[]>([]);
  const item = vm.detail.data;
  const busy = vm.moderation.isPending || vm.forwarding.isPending;
  async function forward() {
    const result = forwardingInputSchema.safeParse({ agency_id: agency, observations: forwardNotes });
    if (!result.success) { setForwardError(result.error.issues[0].message); return; }
    if (!vm.agencies.data?.some(item => item.id === agency && item.is_active)) { setForwardError('Selecione um órgão ativo.'); return; }
    setForwardError('');
    if (await vm.forwarding.submit(result.data)) setForwardNotes('');
  }
  return <div className="page-container">
    <Link className="text-sm font-semibold text-brand-primary hover:underline" to="/admin/occurrences">← Ocorrências</Link>
    {!vm.validId && <p role="alert" className="mt-6">Identificador de ocorrência inválido.</p>}
    {vm.identity.isError && <p role="alert">{safeErrorMessage(vm.identity.error)}</p>}
    {vm.validId && vm.detail.isPending && <p role="status" className="mt-6">Carregando ocorrência…</p>}
    {vm.detail.isError && <div role="alert" className="mt-6"><p>{safeErrorMessage(vm.detail.error)}</p><Button onClick={() => void vm.detail.refetch()}>Tentar novamente</Button></div>}
    {item && <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <section className={panel}>
          <div className="mb-6 flex flex-wrap justify-between gap-3"><h1 className="text-xl font-extrabold">Detalhes da ocorrência #OC-{id.slice(0, 4).toUpperCase()}</h1><StatusBadge status={item.status} /></div>
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div><dt className="text-xs text-ink-secondary">Categoria</dt><dd>{item.category.name}</dd></div>
            <div><dt className="text-xs text-ink-secondary">Prioridade</dt><dd>{item.priority ? priorities[item.priority] : 'Não definida'}</dd></div>
            <div><dt className="text-xs text-ink-secondary">Registro</dt><dd>{date(item.createdAt)}</dd></div>
            <div><dt className="text-xs text-ink-secondary">Cidadão solicitante</dt><dd>{item.author.name.split(' ')[0]} {item.author.name.includes(' ') ? item.author.name.split(' ').at(-1)?.charAt(0) + '.' : ''}</dd></div>
            <div><dt className="text-xs text-ink-secondary">Localização original</dt><dd>{item.locationOriginal.lat.toFixed(5)}, {item.locationOriginal.lng.toFixed(5)}</dd></div>
            <div><dt className="text-xs text-ink-secondary">Localização ajustada</dt><dd>{item.locationAdjusted ? item.locationAdjusted.lat.toFixed(5) + ', ' + item.locationAdjusted.lng.toFixed(5) : 'Sem ajuste'}</dd></div>
          </dl>
          <h2 className="mb-2 mt-6 text-sm font-semibold">Descrição</h2><p className="whitespace-pre-wrap break-words">{item.description}</p>
          <p className="mt-3 text-xs text-ink-secondary">Origem da categoria — {item.categorySource}. Origem da descrição — {item.descriptionSource}.</p>
        </section>
        <section className={panel}>
          <h2 className="mb-4 font-bold">Evidências fotográficas</h2>
          {!item.photoUrls.length && <p>Nenhuma foto disponível.</p>}
          <div className="grid gap-3 sm:grid-cols-3">{item.photoUrls.map(photo =>
            <div key={photo.position}>{Date.parse(photo.expiresAt) <= Date.now() || failedPhotos.includes(photo.url)
              ? <p className="text-sm">Foto indisponível ou expirada.</p>
              : <a href={photo.url} target="_blank" rel="noreferrer"><img className="h-40 w-full rounded-lg object-cover" src={photo.url} alt={'Evidência ' + (photo.position + 1)} onError={() => setFailedPhotos(current => [...current, photo.url])} /></a>}</div>)}</div>
          <Button className="mt-4" variant="ghost" disabled={vm.detail.isFetching} onClick={() => { setFailedPhotos([]); void vm.detail.refetch(); }}>Atualizar fotos</Button>
        </section>
        <section className={panel}>
          <h2 className="mb-4 font-bold">Observações administrativas</h2>
          <form onSubmit={event => { event.preventDefault(); void vm.observations.save(); }}>
            <label className="field-label">Observação<textarea className="field-input mt-2" value={vm.observations.content} onChange={event => vm.observations.setContent(event.target.value)} required minLength={5} maxLength={2000} rows={4} /></label>
            <label className="field-label">Visibilidade<select className="field-input mt-2" value={vm.observations.visibility} onChange={event => vm.observations.setVisibility(event.target.value as 'INTERNAL' | 'CITIZEN_RESPONSE')}>
              <option value="INTERNAL">Interna — apenas administradores</option><option value="CITIZEN_RESPONSE">Resposta ao cidadão — visível ao autor</option>
            </select></label>
            {vm.observations.error && <p role="alert">{vm.observations.error}</p>}
            <Button type="submit" disabled={!vm.canAct || busy}>Salvar observação</Button>
          </form>
        </section>
        <section className={panel}>
          <h2 className="mb-4 font-bold">Encaminhamentos</h2>
          {item.status === 'CONFIRMED' && <form onSubmit={event => { event.preventDefault(); void forward(); }} className="space-y-3">
            <p className="text-sm text-ink-secondary">O envio ao órgão mantém a ocorrência confirmada. O atendimento começa após o aceite do órgão e o registro de uma ação concreta.</p>
            <label className="field-label">Órgão responsável<select className="field-input mt-2" required value={agency} onChange={event => setAgency(event.target.value)} disabled={!vm.agencies.isSuccess}>
              <option value="">Selecione um órgão</option>{vm.agencies.data?.filter(item => item.is_active).map(item => <option key={item.id} value={item.id}>{item.name} — {item.email}</option>)}</select></label>
            <label className="field-label">Observações para o órgão<textarea className="field-input mt-2" maxLength={2000} value={forwardNotes} onChange={event => setForwardNotes(event.target.value)} /></label>
            {forwardError && <p role="alert">{forwardError}</p>}
            <Button type="submit" disabled={!vm.canAct || busy || vm.forwarding.needsReview || !vm.agencies.isSuccess}>Encaminhar ocorrência</Button>
          </form>}
          {vm.agencies.isError && <Button variant="ghost" onClick={() => void vm.agencies.refetch()}>Tentar carregar órgãos novamente</Button>}
          {vm.forwarding.message && <p role="status" className="my-3">{vm.forwarding.message}</p>}
          {vm.forwardings.isPending && <p role="status">Carregando encaminhamentos…</p>}
          {vm.forwardings.isError && <div role="alert"><p>{safeErrorMessage(vm.forwardings.error)}</p><Button onClick={() => void vm.forwardings.refetch()}>Recarregar encaminhamentos</Button></div>}
          {vm.forwardings.isSuccess && <ul className="mt-4 space-y-4">{vm.forwardings.data.map(entry => <li key={entry.id} className="border-t border-line-subtle pt-3">
            <p className="font-semibold">{entry.agencyName ?? 'Órgão'} — {entry.status === 'SENT' ? 'Enviado' : entry.status === 'FAILED' ? 'Falha de envio' : 'Pendente'}</p>
            <p className="text-sm">{date(entry.createdAt)} · {entry.recipientEmail}</p><p className="whitespace-pre-wrap text-sm">{entry.observations}</p>
          </li>)}{!vm.forwardings.data.length && <li>Nenhum encaminhamento registrado.</li>}</ul>}
          {vm.forwarding.needsReview && vm.forwardings.isSuccess && !vm.forwardings.isFetching && <Button variant="outline" className="mt-3" onClick={vm.forwarding.acknowledgeReview}>Revisei o histórico, habilitar novo envio</Button>}
        </section>
      </div>
      <aside className="space-y-6">
        <section className={panel}><h2 className="mb-4 font-bold">Ações da ocorrência</h2>
          <div className="flex flex-col gap-3">{allowedActions(item).filter(value => value !== 'observations').map(value =>
            <Button key={value} variant={value === 'reject' ? 'danger' : 'outline'} disabled={!vm.canAct || busy || (value === 'start-service' && !vm.forwardings.data?.some(entry => entry.status === 'SENT'))} onClick={() => setAction(value)}>{actionLabels[value]}</Button>)}</div>
          {item.status === 'CONFIRMED' && !item.priority && <p className="mt-3 text-sm">Defina a prioridade para iniciar o atendimento.</p>}
          {item.status === 'CONFIRMED' && !vm.forwardings.data?.some(entry => entry.status === 'SENT') && <p className="mt-3 text-sm">O atendimento exige encaminhamento prévio ao órgão responsável.</p>}
          {vm.moderation.message && <p role="status" className="mt-4 text-sm">{vm.moderation.message}</p>}
        </section>
        <section className={panel}><h2 className="mb-4 font-bold">Histórico de ações</h2>
          {vm.history.isPending && <p role="status">Carregando histórico…</p>}
          {vm.history.isError && <div role="alert"><p>{safeErrorMessage(vm.history.error)}</p><Button onClick={() => void vm.history.refetch()}>Recarregar histórico</Button></div>}
          <ol className="space-y-5">{vm.history.data?.map(event => <li key={event.id} className="border-l-2 border-line pl-3">
            <time className="text-xs font-semibold" dateTime={event.createdAt}>{date(event.createdAt)}</time>
            <p className="text-sm">{event.type === 'observation' ? 'Observação' : historyLabels[event.action] ?? event.action}</p>
            {event.visibility && <p className="text-xs text-ink-secondary">{event.visibility === 'INTERNAL' ? 'Interna — apenas administradores' : 'Resposta ao autor'}</p>}
            {event.content && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{event.content}</p>}
          </li>)}</ol>
          {vm.history.isSuccess && !vm.history.data.length && <p>Nenhum evento registrado.</p>}
        </section>
      </aside>
    </div>}
    {action && item && <ModerationForm key={action} action={action} detail={item} categories={vm.categories.data ?? []} pending={busy}
      message={vm.moderation.message} onClose={() => setAction(null)} onSubmit={vm.moderation.submit} />}
  </div>;
}

