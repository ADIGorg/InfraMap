-- Armazenamento privado das respostas recebidas dos órgãos.
CREATE TABLE public.forwarding_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forwarding_id uuid NOT NULL REFERENCES public.forwardings(id) ON DELETE CASCADE,
  message_id text NOT NULL,
  in_reply_to text,
  sender_email text NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  body_text text NOT NULL,
  received_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forwarding_messages_message_id_unique UNIQUE (message_id),
  CONSTRAINT forwarding_messages_message_id_nonempty CHECK (length(trim(message_id)) > 0)
);

CREATE INDEX forwarding_messages_forwarding_date_idx
  ON public.forwarding_messages (forwarding_id, received_at DESC);

ALTER TABLE public.forwarding_messages ENABLE ROW LEVEL SECURITY;

-- A leitura é restrita aos administradores ativos, conforme as regras existentes.
CREATE POLICY forwarding_messages_select_admin
  ON public.forwarding_messages FOR SELECT TO authenticated
  USING (public.is_admin());

-- Não há políticas INSERT/UPDATE/DELETE para authenticated/anon.
-- O serviço de sincronização utiliza exclusivamente a secret/service-role key no backend.
REVOKE ALL ON public.forwarding_messages FROM anon, authenticated;
GRANT SELECT ON public.forwarding_messages TO authenticated;
GRANT ALL ON public.forwarding_messages TO service_role;
-- Não adicionamos a tabela ao Realtime nesta primeira entrega.
