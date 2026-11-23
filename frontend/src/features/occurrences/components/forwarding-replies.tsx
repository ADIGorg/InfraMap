import { useId } from 'react';
import { Button } from '@/shared/components/button';
import { safeErrorMessage } from '@/shared/errors/app-error';
import { useForwardingRepliesViewModel } from '../view-models/use-forwarding-replies-view-model';
import { extractReplyText } from '../services/extract-reply-text';

const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
}).format(new Date(value));

interface ForwardingRepliesProps {
  occurrenceId: string;
  forwardingId: string;
  onSync: () => Promise<void>;
  isSyncing: boolean;
}

/** Somente leitura: as mensagens são importadas pelo backend via IMAP. */
export function ForwardingReplies({ occurrenceId, forwardingId, onSync, isSyncing }: ForwardingRepliesProps) {
  const vm = useForwardingRepliesViewModel(occurrenceId, forwardingId);
  const contentId = useId();

  return (
    <div className="mt-3">
      <Button
        type="button"
        variant="outline"
        aria-controls={contentId}
        aria-expanded={vm.expanded}
        onClick={vm.toggle}
      >
        {vm.expanded ? 'Ocultar respostas do órgão' : 'Ver respostas do órgão'}
      </Button>

      {vm.expanded && (
        <section
          id={contentId}
          aria-label="Respostas recebidas do órgão"
          className="mt-3 rounded-xl border border-line-subtle bg-white p-4"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold">Respostas recebidas</h3>
            <Button
              type="button"
              variant="ghost"
              disabled={isSyncing || vm.replies.isFetching}
              isLoading={isSyncing}
              onClick={() => { void onSync().catch(() => undefined); }}
            >
              Atualizar respostas
            </Button>
          </div>

          {vm.replies.isPending && (
            <p role="status" className="text-sm text-ink-secondary">Carregando respostas…</p>
          )}

          {vm.replies.isError && (
            <div role="alert" className="space-y-2 text-sm">
              <p>{safeErrorMessage(vm.replies.error)}</p>
              <Button type="button" variant="outline" onClick={() => void vm.replies.refetch()}>
                Tentar novamente
              </Button>
            </div>
          )}

          {vm.replies.isSuccess && vm.replies.data.length === 0 && (
            <p className="text-sm text-ink-secondary">
              Nenhuma resposta sincronizada para este encaminhamento até o momento.
            </p>
          )}

          {vm.replies.isSuccess && vm.replies.data.length > 0 && (
            <ol className="space-y-4">
              {vm.replies.data.map(reply => (
                <li key={reply.id} className="border-t border-line-subtle pt-3 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="break-all text-sm font-semibold">{reply.senderEmail}</p>
                    <time className="text-xs text-ink-secondary" dateTime={reply.receivedAt}>
                      {formatDate(reply.receivedAt)}
                    </time>
                  </div>
                  <p className="mt-1 break-words text-sm font-medium">{reply.subject || '(Sem assunto)'}</p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                    {extractReplyText(reply.bodyText) || '(Nenhum texto novo identificado nesta resposta)'}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
