// src/infrastructure/email/providers/smtp-email.provider.ts

import nodemailer, { type Transporter } from "nodemailer";

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SmtpEmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  appPassword: string;
  from: string;
}

/**
 * Envia mensagens por SMTP. Reutiliza o contrato do FWD-01:
 *   - input inválido lança AppError(400, "EMAIL_INVALID_INPUT")
 *   - falhas do servidor SMTP retornam { status: "FAILED", errorCode }
 *   - sucesso retorna { status: "SENT", providerMessageId? }
 *
 * O transporter opcional facilita testes sem conexões reais.
 */
export class SmtpEmailProvider implements EmailSender {
  private readonly transporter: Transporter;

  constructor(
    private readonly config: SmtpEmailConfig,
    transporter?: Transporter,
  ) {
    this.transporter = transporter ?? nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.appPassword,
      },
      connectionTimeout: EMAIL_PROVIDER_TIMEOUT_MS,
      greetingTimeout: EMAIL_PROVIDER_TIMEOUT_MS,
      socketTimeout: EMAIL_PROVIDER_TIMEOUT_MS,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }

  async send(input: EmailInput): Promise<EmailResult> {
    this.validate(input);

    try {
      const info = await this.transporter.sendMail({
        from: this.config.from,
        to: input.to,
        subject: input.subject,
        text: input.body.text,
        ...(input.body.html ? { html: input.body.html } : {}),
        ...(input.attachments?.length
          ? {
              attachments: input.attachments.map((attachment) => ({
                filename: attachment.filename,
                content: Buffer.from(attachment.content, "base64"),
                ...(attachment.contentType
                  ? { contentType: attachment.contentType }
                  : {}),
              })),
            }
          : {}),
      });

      if (!info.accepted?.length || info.rejected?.length) {
        logger.warn(
          { code: "EMAIL_PROVIDER_REJECTED" },
          "email_provider_failed",
        );
        return { status: "FAILED", errorCode: "EMAIL_PROVIDER_REJECTED" };
      }

      return info.messageId
        ? { status: "SENT", providerMessageId: info.messageId }
        : { status: "SENT" };
    } catch (error) {
      const smtpCode =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : undefined;

      const errorCode =
        smtpCode === "EAUTH"
          ? "EMAIL_PROVIDER_AUTH"
          : smtpCode === "ECONNECTION" ||
              smtpCode === "ETIMEDOUT" ||
              smtpCode === "ESOCKET"
            ? "EMAIL_PROVIDER_NETWORK"
            : "EMAIL_PROVIDER_SMTP_ERROR";

      logger.warn(
        {
          code: errorCode,
          errorType: error instanceof Error ? error.name : typeof error,
        },
        "email_provider_failed",
      );

      return { status: "FAILED", errorCode };
    }
  }

  private validate(input: EmailInput): void {
    if (!input.to || !EMAIL_REGEX.test(input.to)) {
      throw new AppError(400, "EMAIL_INVALID_INPUT", "Destinatário inválido.");
    }

    if (!input.subject || input.subject.trim().length === 0) {
      throw new AppError(400, "EMAIL_INVALID_INPUT", "Assunto obrigatório.");
    }

    if (input.subject.length > EMAIL_SUBJECT_MAX_LENGTH) {
      throw new AppError(
        400,
        "EMAIL_INVALID_INPUT",
        `Assunto deve ter no máximo ${EMAIL_SUBJECT_MAX_LENGTH} caracteres.`,
      );
    }

    if (!input.body.text || input.body.text.trim().length === 0) {
      throw new AppError(400, "EMAIL_INVALID_INPUT", "Corpo do e-mail obrigatório.");
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
