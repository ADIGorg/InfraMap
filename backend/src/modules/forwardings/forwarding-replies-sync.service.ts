import "dotenv/config";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "../../infrastructure/supabase/admin-client.js";
import {
  ImapEmailProvider,
  type IncomingEmail,
} from "../../infrastructure/email/providers/imap-email.provider.js";
import { AppError } from "../../shared/errors/app-error.js";

interface ForwardingReference {
  id: string;
  recipient_email: string;
  provider_message_id: string;
}

export interface ReplySyncResult {
  consulted: number;
  eligible: number;
  skipped: number;
}

const PAGE_SIZE = 500;
const MESSAGE_LIMIT = 500;
const MAX_LOOKBACK_DAYS = 90;
const MS_PER_DAY = 86_400_000;

// Compartilha uma sincronização em andamento para a mesma ocorrência.
// Em mais de uma instância de API, usar lock distribuído/rate limit no servidor.
const inFlight = new Map<string, Promise<ReplySyncResult>>();

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new AppError(503, "IMAP_NOT_CONFIGURED", "O recebimento de e-mails não está configurado.");
  }
  return value;
}

function getReader(): ImapEmailProvider {
  const port = Number(process.env.IMAP_PORT ?? 993);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new AppError(500, "IMAP_CONFIG_INVALID", "Porta IMAP inválida.");
  }
  return new ImapEmailProvider({
    host: process.env.IMAP_HOST?.trim() || "imap.gmail.com",
    port,
    secure: true,
    user: requiredEnv("IMAP_USER"),
    appPassword: requiredEnv("IMAP_APP_PASSWORD"),
  });
}

function getSince(): Date {
  const configured = Number(process.env.IMAP_LOOKBACK_DAYS ?? 30);
  if (!Number.isInteger(configured) || configured < 1) {
    throw new AppError(500, "IMAP_CONFIG_INVALID", "IMAP_LOOKBACK_DAYS inválido.");
  }
  const days = Math.min(configured, MAX_LOOKBACK_DAYS);
  return new Date(Date.now() - days * MS_PER_DAY);
}

function normalizeId(value: string): string {
  return value.trim().replace(/^<|>$/g, "");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function loadForwardings(
  admin: SupabaseClient,
  occurrenceId: string,
): Promise<ForwardingReference[]> {
  const result: ForwardingReference[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await admin
      .from("forwardings")
      .select("id,recipient_email,provider_message_id")
      .eq("occurrence_id", occurrenceId)
      .eq("status", "SENT")
      .not("provider_message_id", "is", null)
      .order("id", { ascending: true })
      .range(start, start + PAGE_SIZE - 1);

    if (error) {
      throw new AppError(500, "FORWARDING_LOOKUP_FAILED", "Não foi possível consultar os encaminhamentos.");
    }

    const rows = data ?? [];
    for (const row of rows) {
      if (typeof row.id === "string" &&
          typeof row.recipient_email === "string" &&
          typeof row.provider_message_id === "string") {
        result.push({
          id: row.id,
          recipient_email: row.recipient_email,
          provider_message_id: row.provider_message_id,
        });
      }
    }
    if (rows.length < PAGE_SIZE) break;
  }
  return result;
}

function addIndexEntry(
  index: Map<string, Map<string, ForwardingReference>>,
  messageId: string,
  forwarding: ForwardingReference,
): void {
  const key = normalizeId(messageId);
  if (!key) return;
  const entries = index.get(key) ?? new Map<string, ForwardingReference>();
  entries.set(forwarding.id, forwarding);
  index.set(key, entries);
}

// Indexa a mensagem original e as respostas já importadas para também identificar
// respostas a respostas (encadeamento do e-mail).
async function buildIndex(
  admin: SupabaseClient,
  forwardings: ForwardingReference[],
): Promise<Map<string, Map<string, ForwardingReference>>> {
  const index = new Map<string, Map<string, ForwardingReference>>();
  const forwardingById = new Map(forwardings.map((f) => [f.id, f]));

  for (const forwarding of forwardings) {
    addIndexEntry(index, forwarding.provider_message_id, forwarding);
  }

  for (let start = 0; start < forwardings.length; start += 50) {
    const ids = forwardings.slice(start, start + 50).map((f) => f.id);
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await admin
        .from("forwarding_messages")
        .select("id,forwarding_id,message_id")
        .in("forwarding_id", ids)
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        throw new AppError(500, "FORWARDING_REPLIES_FAILED", "Não foi possível consultar o histórico de respostas.");
      }
      const rows = data ?? [];
      for (const row of rows) {
        const forwarding = forwardingById.get(row.forwarding_id);
        if (forwarding && typeof row.message_id === "string") {
          addIndexEntry(index, row.message_id, forwarding);
        }
      }
      if (rows.length < PAGE_SIZE) break;
    }
  }
  return index;
}

function findMatchingForwarding(
  mail: IncomingEmail,
  index: Map<string, Map<string, ForwardingReference>>,
): ForwardingReference | null {
  const candidateIds = [mail.inReplyTo, ...mail.references]
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0);
  const matches = new Map<string, ForwardingReference>();
  for (const reference of candidateIds) {
    for (const forwarding of index.get(normalizeId(reference))?.values() ?? []) {
      matches.set(forwarding.id, forwarding);
    }
  }
  if (matches.size !== 1) return null;
  const forwarding = matches.values().next().value;
  if (!forwarding || normalizeEmail(mail.from) !== normalizeEmail(forwarding.recipient_email)) {
    return null;
  }
  return forwarding;
}

async function executeSync(occurrenceId: string): Promise<ReplySyncResult> {
  const admin = createSupabaseAdminClient();
  const forwardings = await loadForwardings(admin, occurrenceId);
  if (forwardings.length === 0) return { consulted: 0, eligible: 0, skipped: 0 };

  const index = await buildIndex(admin, forwardings);
  let emails: IncomingEmail[];
  const reader = getReader();
  const since = getSince();

  try {
    emails = await reader.fetchSince(since, MESSAGE_LIMIT);
  } catch (error: unknown) {
    console.error("[IMAP] Falha ao consultar Gmail:", {
      name: error instanceof Error ? error.name : "UnknownError",
      message:
        error instanceof Error
          ? error.message
          : "Erro desconhecido",
    });

    throw new AppError(
      502,
      "IMAP_SYNC_FAILED",
      "Não foi possível consultar a caixa de e-mail.",
    );
  }
  
  let eligible = 0;
  for (const mail of emails) {
    const forwarding = findMatchingForwarding(mail, index);
    const messageId = normalizeId(mail.messageId);
    if (!forwarding || !messageId) continue;

    const { error } = await admin.from("forwarding_messages").upsert({
      forwarding_id: forwarding.id,
      message_id: messageId,
      in_reply_to: mail.inReplyTo ? normalizeId(mail.inReplyTo) : null,
      sender_email: mail.from,
      recipient_email: mail.to,
      subject: mail.subject,
      body_text: mail.bodyText,
      received_at: mail.receivedAt,
    }, { onConflict: "message_id", ignoreDuplicates: true });

    if (error) {
      throw new AppError(500, "REPLY_IMPORT_FAILED", "Não foi possível armazenar as respostas recebidas.");
    }
    eligible++;
    // Possibilita associar outra mensagem deste mesmo lote que responda a esta.
    addIndexEntry(index, messageId, forwarding);
  }
  return { consulted: emails.length, eligible, skipped: emails.length - eligible };
}

/** Uma chamada por ocorrência, disparada exclusivamente por uma rota administrativa. */
export function syncForwardingReplies(occurrenceId: string): Promise<ReplySyncResult> {
  const running = inFlight.get(occurrenceId);
  if (running) return running;

  const job = executeSync(occurrenceId);
  inFlight.set(occurrenceId, job);
  void job.then(
    () => { if (inFlight.get(occurrenceId) === job) inFlight.delete(occurrenceId); },
    () => { if (inFlight.get(occurrenceId) === job) inFlight.delete(occurrenceId); },
  );
  return job;
}
