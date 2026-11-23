
import "dotenv/config";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "../infrastructure/supabase/admin-client.js";

import {
  ImapEmailProvider,
  type IncomingEmail,
  type ImapEmailConfig,
} from "../infrastructure/email/providers/imap-email.provider.js";

// ============================================================
// Constantes
// ============================================================

const DEFAULT_IMAP_HOST = "imap.gmail.com";
const DEFAULT_IMAP_PORT = 993;
const DEFAULT_LOOKBACK_DAYS = 30;

const MIN_LOOKBACK_DAYS = 1;
const MAX_LOOKBACK_DAYS = 90;

const FORWARDINGS_PAGE_SIZE = 500;
const MILLISECONDS_PER_DAY = 86_400_000;

// ============================================================
// Tipos
// ============================================================

interface ForwardingReference {
  id: string;
  recipient_email: string;
  provider_message_id: string;
}

interface SyncStats {
  consulted: number;
  eligible: number;
  skipped: number;
}

// ============================================================
// Ambiente
// ============================================================

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Variável obrigatória não configurada: ${name}`,
    );
  }

  return value;
}

function positiveIntegerEnv(
  name: string,
  fallback: number,
): number {
  const raw = process.env[name];

  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      `${name} deve ser um número inteiro positivo.`,
    );
  }

  return value;
}

function getLookbackDays(): number {
  const days = positiveIntegerEnv(
    "IMAP_LOOKBACK_DAYS",
    DEFAULT_LOOKBACK_DAYS,
  );

  return Math.min(
    MAX_LOOKBACK_DAYS,
    Math.max(MIN_LOOKBACK_DAYS, days),
  );
}

function createImapReader(): ImapEmailProvider {
  const config: ImapEmailConfig = {
    host: process.env.IMAP_HOST?.trim() || DEFAULT_IMAP_HOST,
    port: positiveIntegerEnv(
      "IMAP_PORT",
      DEFAULT_IMAP_PORT,
    ),
    secure: true,
    user: requiredEnv("IMAP_USER"),
    appPassword: requiredEnv("IMAP_APP_PASSWORD"),
  };

  return new ImapEmailProvider(config);
}

// ============================================================
// Normalização
// ============================================================

function normalizeMessageId(value: string): string {
  return value.trim().replace(/^<|>$/g, "");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

// ============================================================
// Encaminhamentos
// ============================================================

async function loadSentForwardings(
  admin: SupabaseClient,
): Promise<ForwardingReference[]> {
  const forwardings: ForwardingReference[] = [];

  for (let start = 0; ; start += FORWARDINGS_PAGE_SIZE) {
    const { data, error } = await admin
      .from("forwardings")
      .select(
        "id, recipient_email, provider_message_id",
      )
      .eq("status", "SENT")
      .not("provider_message_id", "is", null)
      .order("id", { ascending: true })
      .range(start, start + FORWARDINGS_PAGE_SIZE - 1);

    if (error) {
      throw new Error(
        `Falha ao consultar encaminhamentos: ${error.code}`,
      );
    }

    const rows = data ?? [];

    for (const row of rows) {
      if (
        typeof row.id !== "string" ||
        typeof row.recipient_email !== "string" ||
        typeof row.provider_message_id !== "string"
      ) {
        continue;
      }

      forwardings.push({
        id: row.id,
        recipient_email: row.recipient_email,
        provider_message_id: row.provider_message_id,
      });
    }

    if (rows.length < FORWARDINGS_PAGE_SIZE) {
      break;
    }
  }

  return forwardings;
}

function indexForwardings(
  forwardings: ForwardingReference[],
): Map<string, ForwardingReference[]> {
  const index = new Map<string, ForwardingReference[]>();

  for (const forwarding of forwardings) {
    const messageId = normalizeMessageId(
      forwarding.provider_message_id,
    );

    if (!messageId) {
      continue;
    }

    const matches = index.get(messageId) ?? [];
    matches.push(forwarding);

    index.set(messageId, matches);
  }

  return index;
}

// ============================================================
// Associação das respostas
// ============================================================

function findRelatedForwarding(
  email: IncomingEmail,
  index: Map<string, ForwardingReference[]>,
): ForwardingReference | null {
  const references = [
    email.inReplyTo,
    ...email.references,
  ]
    .filter((id): id is string => Boolean(id))
    .map(normalizeMessageId)
    .filter(Boolean);

  if (references.length === 0) {
    return null;
  }

  const candidates = new Map<string, ForwardingReference>();

  for (const reference of references) {
    for (const forwarding of index.get(reference) ?? []) {
      candidates.set(forwarding.id, forwarding);
    }
  }

  // Uma resposta não pode ser associada de forma ambígua.
  if (candidates.size !== 1) {
    return null;
  }

  const forwarding = candidates.values().next().value;

  if (!forwarding) {
    return null;
  }

  // Confirma que a resposta veio do destinatário original.
  if (
    normalizeEmail(email.from) !==
    normalizeEmail(forwarding.recipient_email)
  ) {
    return null;
  }

  return forwarding;
}

// ============================================================
// Persistência
// ============================================================

async function persistReply(
  admin: SupabaseClient,
  forwarding: ForwardingReference,
  email: IncomingEmail,
): Promise<void> {
  const messageId = normalizeMessageId(email.messageId);

  if (!messageId) {
    return;
  }

  const { error } = await admin
    .from("forwarding_messages")
    .upsert(
      {
        forwarding_id: forwarding.id,
        message_id: messageId,
        in_reply_to: email.inReplyTo
          ? normalizeMessageId(email.inReplyTo)
          : null,
        sender_email: email.from,
        recipient_email: email.to,
        subject: email.subject,
        body_text: email.bodyText,
        received_at: email.receivedAt,
      },
      {
        onConflict: "message_id",
        ignoreDuplicates: true,
      },
    );

  if (error) {
    throw new Error(
      `Falha ao persistir resposta: ${error.code}`,
    );
  }
}

// ============================================================
// Sincronização
// ============================================================

async function syncForwardingReplies(
  admin: SupabaseClient,
  reader: ImapEmailProvider,
): Promise<SyncStats> {
  const lookbackDays = getLookbackDays();

  const since = new Date(
    Date.now() - lookbackDays * MILLISECONDS_PER_DAY,
  );

  const [emails, forwardings] = await Promise.all([
    reader.fetchSince(since),
    loadSentForwardings(admin),
  ]);

  const index = indexForwardings(forwardings);

  const stats: SyncStats = {
    consulted: emails.length,
    eligible: 0,
    skipped: 0,
  };

  for (const email of emails) {
    const forwarding = findRelatedForwarding(
      email,
      index,
    );

    if (!forwarding) {
      stats.skipped++;
      continue;
    }

    await persistReply(admin, forwarding, email);
    stats.eligible++;
  }

  return stats;
}

// ============================================================
// Inicialização
// ============================================================

async function main(): Promise<void> {
  const admin = createSupabaseAdminClient();
  const reader = createImapReader();

  const stats = await syncForwardingReplies(
    admin,
    reader,
  );

  console.info("Sincronização IMAP concluída", {
    mensagensConsultadas: stats.consulted,
    respostasElegiveis: stats.eligible,
    mensagensIgnoradas: stats.skipped,
  });
}

main().catch((error: unknown) => {
  console.error("Sincronização IMAP falhou", {
    errorType:
      error instanceof Error
        ? error.name
        : typeof error,
  });

  process.exitCode = 1;
});
