import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ThumbsUp } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { Select } from '@/shared/components/select';
import { StatusBadge } from '@/shared/components/status-badge';
import { OccurrenceAddress } from '@/shared/components/occurrence-address';
import { safeErrorMessage } from '@/shared/errors/app-error';
import { useAdminOccurrenceDetailViewModel } from '../view-models/use-admin-occurrence-detail-view-model';
import { actionLabels, allowedActions, type ModerationAction } from '../services/detail-moderation.service';
import { forwardingInputSchema } from '../services/forwardings.service';
import { ModerationForm } from '../components/moderation-form';
import { ForwardingReplies } from '../components/forwarding-replies';

const date = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
}).format(new Date(value));
const panel = 'rounded-2xl border border-line-subtle bg-white p-6';
const priorities = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta' };
const sourceLabels: Record<string, string> = {
  AI_CONFIRMED: 'Sugestão da IA confirmada pelo cidadão',
  AI_EDITED: 'Sugestão da IA editada pelo cidadão',
  USER_MANUAL: 'Informada manualmente pelo cidadão',
  ADMIN_CORRECTED: 'Corrigida pela administração',
};
const historyLabels: Record<string, string> = {
  CREATED: 'Ocorrência registrada', OCCURRENCE_CREATED: 'Ocorrência registrada',
  ANALYSIS_STARTED: 'Análise iniciada', OCCURRENCE_CONFIRMED: 'Ocorrência confirmada',
  OCCURRENCE_REJECTED: 'Ocorrência rejeitada', STATUS_CHANGED: 'Status alterado',
  PRIORITY_DEFINED: 'Prioridade definida', PRIORITY_CHANGED: 'Prioridade alterada', PRIORITY_UPDATED: 'Prioridade alterada',
  LOCATION_ADJUSTED: 'Localização ajustada', CLASSIFICATION_CORRECTED: 'Classificação corrigida',
  OBSERVATION_CREATED: 'Observação registrada', OBSERVATION_ADDED: 'Observação registrada',
  OBSERVATION_INTERNAL_ADDED: 'Observação interna registrada',
  OBSERVATION_CITIZEN_REPLY_ADDED: 'Resposta ao cidadão registrada',
  OBSERVATION_CITIZEN_RESPONSE_ADDED: 'Resposta ao cidadão registrada',
  FORWARDED_TO_AGENCY: 'Encaminhada ao órgão',
  FORWARDING_CREATED: 'Encaminhamento registrado',
  FORWARDING_SENT: 'Encaminhamento enviado', FORWARDING_FAILED: 'Falha no encaminhamento',
};
const historyStatuses: Record<string, string> = {
  RECEIVED: 'Recebida', UNDER_ANALYSIS: 'Em análise', CONFIRMED: 'Confirmada',
  IN_SERVICE: 'Em atendimento', RESOLVED: 'Resolvida', REJECTED: 'Rejeitada',
};
function labelForCode(labels: Record<string, string>, code: string, fallback: string): string {
  return Object.hasOwn(labels, code) ? labels[code] : fallback;
}
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
  const hasSentForwarding = vm.forwardings.isSuccess && vm.forwardings.data.some(entry => entry.status === 'SENT');
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
          <div className="mb-6 flex flex-wrap justify-between gap-3">
            <h1 className="text-xl font-extrabold">Detalhes da ocorrência #OC-{id.slice(0, 4).toUpperCase()}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm tabular-nums text-ink-secondary"><ThumbsUp size={16} aria-hidden="true" />
                {item.votesCount.toLocaleString('pt-BR')} {item.votesCount === 1 ? 'curtida' : 'curtidas'}
              </span>
              <StatusBadge status={item.status} />
            </div>
          </div>
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div><dt className="text-xs text-ink-secondary">Categoria</dt><dd>{item.category.name}</dd></div>
            <div><dt className="text-xs text-ink-secondary">Prioridade</dt><dd>{item.priority ? priorities[item.priority] : 'Não definida'}</dd></div>
            <div><dt className="text-xs text-ink-secondary">Registro</dt><dd>{date(item.createdAt)}</dd></div>
            <div><dt className="text-xs text-ink-secondary">Cidadão solicitante</dt><dd>{item.author.name.split(' ')[0]} {item.author.name.includes(' ') ? item.author.name.split(' ').at(-1)?.charAt(0) + '.' : ''}</dd></div>
            <div><dt className="text-xs text-ink-secondary">Localização original</dt><dd>{item.locationOriginal.lat.toFixed(5)}, {item.locationOriginal.lng.toFixed(5)}</dd></div>
            <div><dt className="text-xs text-ink-secondary">Localização ajustada</dt><dd>{item.locationAdjusted ? item.locationAdjusted.lat.toFixed(5) + ', ' + item.locationAdjusted.lng.toFixed(5) : 'Sem ajuste'}</dd></div>
          </dl>
          <div className="mt-5"><h2 className="text-sm font-semibold">Endereço da posição atual</h2><OccurrenceAddress point={item.location} /></div>
          <h2 className="mb-2 mt-6 text-sm font-semibold">Descrição</h2><p className="whitespace-pre-wrap break-words">{item.description}</p>
          <p className="mt-3 text-xs text-ink-secondary">Origem da categoria — {labelForCode(sourceLabels, item.categorySource, 'Não identificada')}. Origem da descrição — {labelForCode(sourceLabels, item.descriptionSource, 'Não identificada')}.</p>
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
            <label className="field-label">Visibilidade<Select className="mt-2" value={vm.observations.visibility} onValueChange={value => vm.observations.setVisibility(value as 'INTERNAL' | 'CITIZEN_RESPONSE')}
              options={[{ value: 'INTERNAL', label: 'Interna — apenas administradores' }, { value: 'CITIZEN_RESPONSE', label: 'Resposta ao cidadão — visível ao autor' }]} /></label>
            {vm.observations.error && <p role="alert">{vm.observations.error}</p>}
            <Button type="submit" disabled={!vm.canAct || busy}>Salvar observação</Button>
          </form>
        </section>
        <section className={panel}>
          <h2 className="mb-4 font-bold">Encaminhamentos</h2>
          {vm.replySync.isPending && <p role="status" className="mb-3 text-sm text-ink-secondary">Sincronizando respostas do Gmail…</p>}
          {vm.replySync.isError && <p role="alert" className="mb-3 text-sm text-red-700">Não foi possível sincronizar as respostas: {safeErrorMessage(vm.replySync.error)}</p>}
          {item.status === 'CONFIRMED' && <form onSubmit={event => { event.preventDefault(); void forward(); }} className="space-y-3">
            <p className="text-sm text-ink-secondary">O encaminhamento envia o relatório ao órgão e mantém a ocorrência confirmada. O aceite do e-mail pelo provedor não comprova recebimento nem aceite do órgão. Para iniciar o atendimento, confirme a atuação do órgão e registre a ação concreta.</p>
            <label className="field-label">Órgão responsável<Select className="mt-2" required value={agency} onValueChange={setAgency} disabled={!vm.agencies.isSuccess}
              options={[{ value: '', label: 'Selecione um órgão' }, ...(vm.agencies.data ?? []).filter(item => item.is_active).map(item => ({ value: item.id, label: `${item.name} — ${item.email}` }))]} /></label>
            <label className="field-label">Observações para o órgão<textarea className="field-input mt-2" maxLength={2000} value={forwardNotes} onChange={event => setForwardNotes(event.target.value)} /></label>
            {forwardError && <p role="alert">{forwardError}</p>}
            <Button type="submit" disabled={!vm.canAct || busy || vm.forwarding.needsReview || !vm.agencies.isSuccess}>Encaminhar ocorrência</Button>
          </form>}
          {vm.agencies.isError && <Button variant="ghost" onClick={() => void vm.agencies.refetch()}>Tentar carregar órgãos novamente</Button>}
          {vm.forwarding.message && <p role="status" className="my-3">{vm.forwarding.message}</p>}
          {vm.forwardings.isPending && <p role="status">Carregando encaminhamentos…</p>}
          {vm.forwardings.isError && <div role="alert"><p>{safeErrorMessage(vm.forwardings.error)}</p><Button onClick={() => void vm.forwardings.refetch()}>Recarregar encaminhamentos</Button></div>}
          {vm.forwardings.isSuccess && <ul className="mt-4 space-y-4">{vm.forwardings.data.map(entry => <li key={entry.id} className="border-t border-line-subtle pt-3">
            <p className="font-semibold">{entry.agencyName ?? 'Órgão'} — {entry.status === 'SENT' ? 'Aceito pelo provedor' : entry.status === 'FAILED' ? 'Falha de envio' : 'Pendente'}</p>
            <p className="text-sm">{date(entry.createdAt)} · {entry.recipientEmail}</p><p className="whitespace-pre-wrap text-sm">{entry.observations}</p>
            {entry.status === 'SENT' && <ForwardingReplies
              occurrenceId={id}
              forwardingId={entry.id}
              onSync={vm.replySync.sync}
              isSyncing={vm.replySync.isPending}
            />}
          </li>)}{!vm.forwardings.data.length && <li>Nenhum encaminhamento registrado.</li>}</ul>}
          {vm.forwarding.needsReview && vm.forwardings.isSuccess && !vm.forwardings.isFetching && <Button variant="outline" className="mt-3" onClick={vm.forwarding.acknowledgeReview}>Revisei o histórico, habilitar novo envio</Button>}
        </section>
      </div>
      <aside className="space-y-6">
        <section className={panel}><h2 className="mb-4 font-bold">Ações da ocorrência</h2>
          {item.status === 'IN_SERVICE' && <div className="mb-4 space-y-3 rounded-xl border border-brand-primary/25 bg-surface-info p-4">
            <p className="font-semibold text-brand-primary">Atendimento em andamento</p>
            <p className="text-sm">Quando o problema for solucionado, registre o que foi feito e conclua manualmente a ocorrência.</p>
            <Button className="w-full" disabled={!vm.canAct || busy} onClick={() => setAction('resolve')}>Marcar como resolvida</Button>
            <Button variant="outline" className="w-full border-red-200 text-red-700 hover:bg-red-50" disabled={!vm.canAct || busy} onClick={() => setAction('reject')}>Encerrar sem resolução</Button>
          </div>}
          <div className="flex flex-col gap-3">{allowedActions(item).filter(value => value !== 'observations' && value !== 'resolve'
            && (value !== 'reject' || item.status === 'UNDER_ANALYSIS' || (item.status === 'CONFIRMED' && hasSentForwarding))).map(value =>
            <Button key={value} variant={value === 'reject' ? 'danger' : 'outline'} disabled={!vm.canAct || busy || (value === 'start-service' && !hasSentForwarding)} onClick={() => setAction(value)}>{actionLabels[value]}</Button>)}</div>
          {item.status === 'CONFIRMED' && !item.priority && <p className="mt-3 text-sm">Defina a prioridade para iniciar o atendimento.</p>}
          {item.status === 'CONFIRMED' && vm.forwardings.isError && <p role="alert" className="mt-3 text-sm text-red-800">Não foi possível verificar os encaminhamentos. Recarregue a lista antes de iniciar o atendimento.</p>}
          {item.status === 'CONFIRMED' && vm.forwardings.isSuccess && !vm.forwardings.data.some(entry => entry.status === 'SENT') && <p className="mt-3 text-sm">É necessário registrar um encaminhamento aceito pelo provedor antes de iniciar o atendimento. O envio não comprova aceite do órgão.</p>}
          {item.status === 'CONFIRMED' && vm.forwardings.isSuccess && vm.forwardings.data.some(entry => entry.status === 'SENT') && <p className="mt-3 text-sm">Depois de iniciar o atendimento e registrar a ação concreta, você poderá marcar a ocorrência como resolvida nesta tela.</p>}
          {item.status === 'RESOLVED' && <p role="status" className="mt-3 text-sm">Esta ocorrência foi resolvida. A conclusão está registrada no histórico.</p>}
          {!action && vm.moderation.message && <p role="status" className="mt-4 text-sm">{vm.moderation.message}</p>}
        </section>
        <section className={panel}><h2 className="mb-4 font-bold">Histórico de ações</h2>
          {vm.history.isPending && <p role="status">Carregando histórico…</p>}
          {vm.history.isError && <div role="alert"><p>{safeErrorMessage(vm.history.error)}</p><Button onClick={() => void vm.history.refetch()}>Recarregar histórico</Button></div>}
          <ol className="space-y-5">{vm.history.data?.map(event => <li key={event.id} className="border-l-2 border-line pl-3">
            <time className="text-xs font-semibold" dateTime={event.createdAt}>{date(event.createdAt)}</time>
            <p className="text-sm">{event.details?.rejection_type === 'SERVICE_INTERRUPTED' ? 'Atendimento encerrado sem resolução'
              : event.type === 'observation' ? 'Observação' : labelForCode(historyLabels, event.action, 'Ação registrada')}</p>
            {typeof event.previousData?.status === 'string' && typeof event.newData?.status === 'string' &&
              <p className="text-xs text-ink-secondary">De {labelForCode(historyStatuses, event.previousData.status, 'status não identificado')} para {labelForCode(historyStatuses, event.newData.status, 'status não identificado')}.</p>}
            {typeof event.details?.reason === 'string' && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-ink-secondary">Justificativa: {event.details.reason}</p>}
            {typeof event.details?.agency_response === 'string' && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-ink-secondary">Resposta do órgão: {event.details.agency_response}</p>}
            {event.visibility && <p className="text-xs text-ink-secondary">{event.visibility === 'INTERNAL' ? 'Interna — apenas administradores' : 'Resposta ao autor'}</p>}
            {event.content && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{event.content}</p>}
          </li>)}</ol>
          {vm.history.isSuccess && !vm.history.data.length && <p>Nenhum evento registrado.</p>}
        </section>
      </aside>
    </div>}
    {action && item && <ModerationForm key={action} action={action} detail={item} categories={vm.categories.data ?? []} pending={busy}
      message={vm.moderation.error} onClose={() => setAction(null)} onSubmit={vm.moderation.submit} />}
  </div>;
}
