// src/infrastructure/email/providers/mock-email.provider.ts

import { AppError } from "../../../shared/errors/app-error.js";

import type {
  EmailInput,
  EmailResult,
  EmailSender,
} from "../email-sender.interface.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Provider simulado — FWD-01.
 *
 * Retorna sempre `SENT` com `providerMessageId` fixo.
 * Validação de input idêntica ao `HttpEmailProvider` (mesmas regras 400),
 * para os testes de use case exercitarem o mesmo caminho.
 */
export class MockEmailProvider implements EmailSender {
  async send(input: EmailInput): Promise<EmailResult> {
    if (!input.to || !EMAIL_REGEX.test(input.to)) {
      throw new AppError(
        400,
        "EMAIL_INVALID_INPUT",
        "Destinatário inválido.",
      );
    }

    return {
      status: "SENT",
      providerMessageId: "mock-message-id",
    };
  }
}