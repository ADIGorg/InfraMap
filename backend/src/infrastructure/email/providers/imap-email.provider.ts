
import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";

// ============================================================
// Interfaces
// ============================================================

export interface IncomingEmail {
  messageId: string;
  references: string[];
  inReplyTo?: string;
  from: string;
  to: string;
  subject: string;
  bodyText: string;
  receivedAt: string;
}

export interface ImapEmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  appPassword: string;
}

// ============================================================
// Constantes
// ============================================================

const MAX_BODY_LENGTH = 100_000;
const DEFAULT_MAX_MESSAGES = 500;

// ============================================================
// Helpers
// ============================================================

function normalizeReferences(
  references: ParsedMail["references"],
): string[] {
  if (Array.isArray(references)) {
    return references.filter(Boolean);
  }

  if (typeof references === "string") {
    return references.split(/\s+/).filter(Boolean);
  }

  return [];
}

function parseIncomingEmail(
  parsed: ParsedMail,
): IncomingEmail | null {
  const messageId = parsed.messageId;
  const from = parsed.from?.value[0]?.address;

  if (!messageId || !from) {
    return null;
  }

  const to =
    parsed.to && !Array.isArray(parsed.to)
      ? (parsed.to.value[0]?.address ?? "")
      : "";

  const inReplyTo =
    typeof parsed.inReplyTo === "string"
      ? parsed.inReplyTo
      : undefined;

  return {
    messageId,
    references: normalizeReferences(parsed.references),
    ...(inReplyTo !== undefined ? { inReplyTo } : {}),
    from,
    to,
    subject: parsed.subject ?? "",
    bodyText: (parsed.text ?? "").slice(0, MAX_BODY_LENGTH),
    receivedAt: (parsed.date ?? new Date()).toISOString(),
  };
}

// ============================================================
// IMAP Provider
// ============================================================

/**
 * Provider responsável pela leitura de e-mails recebidos.
 *
 * Responsabilidades:
 * - Conectar ao servidor IMAP.
 * - Consultar mensagens a partir de uma data.
 * - Interpretar cabeçalhos e conteúdo.
 * - Retornar mensagens normalizadas.
 * - Encerrar a conexão com segurança.
 *
 * Não possui responsabilidade de persistência.
 * Não deve ser utilizado diretamente pelo frontend.
 */
export class ImapEmailProvider {
  constructor(
    private readonly config: ImapEmailConfig,
  ) {}

  async fetchSince(
    since: Date,
    maxMessages = DEFAULT_MAX_MESSAGES,
  ): Promise<IncomingEmail[]> {
    if (Number.isNaN(since.getTime())) {
      throw new Error("Data inicial IMAP inválida.");
    }

    if (!Number.isSafeInteger(maxMessages) || maxMessages <= 0) {
      throw new Error("maxMessages deve ser um inteiro positivo.");
    }

    const client = this.createClient();

    await client.connect();

    try {
      return await this.fetchMessages(client, since, maxMessages);
    } finally {
      await client.logout();
    }
  }

  // ==========================================================
  // Conexão
  // ==========================================================

  private createClient(): ImapFlow {
    return new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.appPassword,
      },
      logger: false,
    });
  }

  // ==========================================================
  // Consulta das mensagens
  // ==========================================================

  private async fetchMessages(
    client: ImapFlow,
    since: Date,
    maxMessages: number,
  ): Promise<IncomingEmail[]> {
    const lock = await client.getMailboxLock("INBOX");

    try {
      const uids = await client.search(
        { since },
        { uid: true },
      );

      if (!uids || uids.length === 0) {
        return [];
      }

      const selectedUids = uids
        .sort((a, b) => a - b)
        .slice(-maxMessages);

      const messages: IncomingEmail[] = [];
      const processedIds = new Set<string>();

      for await (const mail of client.fetch(
        selectedUids.join(","),
        { source: true },
        { uid: true },
      )) {
        if (!mail.source) {
          continue;
        }

        const parsed = await simpleParser(mail.source);
        const email = parseIncomingEmail(parsed);

        if (!email) {
          continue;
        }

        // Evita mensagens duplicadas no mesmo lote.
        if (processedIds.has(email.messageId)) {
          continue;
        }

        processedIds.add(email.messageId);
        messages.push(email);
      }

      return messages.sort(
        (a, b) =>
          new Date(a.receivedAt).getTime() -
          new Date(b.receivedAt).getTime(),
      );
    } finally {
      lock.release();
    }
  }
}
