// src/infrastructure/email/providers/http-email.provider.ts

import { z } from "zod";

import {
  EMAIL_BODY_MAX_LENGTH,
  EMAIL_PROVIDER_TIMEOUT_MS,
  EMAIL_SUBJECT_MAX_LENGTH,
} from "../../../config/constants.js";

import { AppError } from "../../../shared/errors/app-error.js";
import { logger } from "../../../shared/logger/logger.js";

import type {
  EmailInput,
  EmailResult,
  EmailSender,
} from "../email-sender.interface.js";

// ============================================================
// Schema da resposta — tolera variações dos provedores
// ============================================================
//   Resend:     { id: "..." }
//   Postmark:   { MessageID: "..." }
//   SendGrid:   { message_id: "..." }  (via API v3)
// ============================================================
const responseSchema = z.object({
  id: z.string().optional(),
  message_id: z.string().optional(),
  MessageID: z.string().optional(),
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface HttpEmailConfig {
  apiUrl: string;
  apiKey: string;
  from: string;
}

/**
 * Provider HTTP genérico. Espera endpoint compatível com o formato
 * Resend: `POST { from, to, subject, text, html? }` + `Authorization: Bearer <key>`.
 *
 * Provedores que exigem formato diferente (SendGrid v3, Postmark, Mailgun)
 * devem ser encapsulados por um shim HTTP — ou um provider novo no futuro.
 * Basta apontar `EMAIL_API_URL` para o shim.
 */
export class HttpEmailProvider implements EmailSender {
  constructor(
    private readonly config: HttpEmailConfig,
    private readonly http: typeof fetch = fetch,
  ) {}

  async send(input: EmailInput): Promise<EmailResult> {
    this.validate(input);

    let response: Response;
    try {
      response = await this.http(this.config.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(EMAIL_PROVIDER_TIMEOUT_MS),
        body: JSON.stringify({
          from: this.config.from,
          to: input.to,
          subject: input.subject,
          text: input.body.text,
          ...(input.body.html ? { html: input.body.html } : {}),
        }),
      });
    } catch (err) {
      // Timeout, DNS, TLS, conexão recusada — falha de rede.
      logger.warn(
        {
          code: "EMAIL_PROVIDER_NETWORK",
          errorType: err instanceof Error ? err.name : typeof err,
        },
        "email_provider_failed",
      );
      return { status: "FAILED", errorCode: "EMAIL_PROVIDER_NETWORK" };
    }

    if (!response.ok) {
      const errorCode =
        response.status < 500
          ? "EMAIL_PROVIDER_CLIENT_ERROR"
          : "EMAIL_PROVIDER_SERVER_ERROR";

      logger.warn(
        { code: errorCode, httpStatus: response.status },
        "email_provider_failed",
      );
      return { status: "FAILED", errorCode };
    }

    // 2xx — sucesso. Tenta extrair providerMessageId; ausência não é falha.
    let providerMessageId: string | undefined;
    try {
      const body = responseSchema.parse(await response.json());
      providerMessageId = body.id ?? body.message_id ?? body.MessageID;
    } catch {
      // Resposta não-JSON é tolerada (200 sem body já é sucesso).
    }

    return providerMessageId
      ? { status: "SENT", providerMessageId }
      : { status: "SENT" };
  }

  private validate(input: EmailInput): void {
    if (!input.to || !EMAIL_REGEX.test(input.to)) {
      throw new AppError(
        400,
        "EMAIL_INVALID_INPUT",
        "Destinatário inválido.",
      );
    }

    if (!input.subject || input.subject.trim().length === 0) {
      throw new AppError(
        400,
        "EMAIL_INVALID_INPUT",
        "Assunto obrigatório.",
      );
    }

    if (input.subject.length > EMAIL_SUBJECT_MAX_LENGTH) {
      throw new AppError(
        400,
        "EMAIL_INVALID_INPUT",
        `Assunto deve ter no máximo ${EMAIL_SUBJECT_MAX_LENGTH} caracteres.`,
      );
    }

    if (!input.body.text || input.body.text.trim().length === 0) {
      throw new AppError(
        400,
        "EMAIL_INVALID_INPUT",
        "Corpo do e-mail obrigatório.",
      );
    }

    if (input.body.text.length > EMAIL_BODY_MAX_LENGTH) {
      throw new AppError(
        400,
        "EMAIL_INVALID_INPUT",
        `Corpo do e-mail deve ter no máximo ${EMAIL_BODY_MAX_LENGTH} caracteres.`,
      );
    }

    if (input.body.html && input.body.html.length > EMAIL_BODY_MAX_LENGTH) {
      throw new AppError(
        400,
        "EMAIL_INVALID_INPUT",
        `HTML do e-mail deve ter no máximo ${EMAIL_BODY_MAX_LENGTH} caracteres.`,
      );
    }
  }
}