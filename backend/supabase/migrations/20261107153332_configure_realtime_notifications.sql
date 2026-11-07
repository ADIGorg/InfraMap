-- DB-12: habilita `notifications` na publicação `supabase_realtime`.
-- Depende de DB-07 (tabela notifications) e DB-09 (RLS notifications_select_own).
--
-- Escopo:
--   1. ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications.
--   2. Documentar contrato de assinatura via COMMENT ON TABLE.
--
-- RLS NÃO é alterado: `notifications_select_own` (DB-09) já limita entrega
-- ao próprio user_id. Realtime Postgres Changes respeita RLS no modo
-- authenticated. Sem a policy, a Realtime entregaria eventos de outros
-- usuários — DB-09 é pré-requisito crítico.
--
-- A publicação `supabase_realtime` é criada pela infraestrutura Supabase.
-- Se não existir no ambiente (setup quebrado), o bloco emite WARNING e não
-- falha — o problema é de infra, não de migration.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    RAISE WARNING
      'Publication "supabase_realtime" não existe — Realtime não funcionará neste ambiente. Verificar setup do projeto Supabase.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

COMMENT ON TABLE public.notifications IS $comment$
Notificações persistidas. REST é fonte de verdade; Realtime (DB-12) é canal
opcional.

REST (fonte de verdade):
  GET /notifications (anexo 05) continua funcionando mesmo se o Realtime
  cair. Notificações sobrevivem a quedas — cliente reconectado busca o que
  perdeu via REST.

Realtime (Postgres Changes):
  supabase
    .channel('notifications:' || userId)
    .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications',
          filter: 'user_id=eq.' || userId },
        (payload) => handleNewNotification(payload.new))
    .subscribe();

  - JWT obrigatório: cliente autentica via Supabase Auth
    (signInWithPassword / refresh). O token é enviado no handshake WebSocket.
  - RLS `notifications_select_own` garante entrega apenas ao próprio
    destinatário. O `filter` no subscribe é otimização de rede, NÃO
    autorização — RLS é a autoridade.
  - Eventos emitidos após COMMIT (logical replication). Transações
    revertidas não emitem.
  - Admin NÃO recebe eventos de notifications (spec §8 — admin ✗).
  - Sem Redis, sem fila, sem push: apenas WAL streaming nativo do PostgreSQL.
$comment$;