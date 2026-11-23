// src/infrastructure/email/email-sender.factory.ts

import { env } from "../../config/env.js";

import type { EmailSender } from "./email-sender.interface.js";

import { HttpEmailProvider } from "./providers/http-email.provider.js";
import { MockEmailProvider } from "./providers/mock-email.provider.js";
import { SmtpEmailProvider } from "./providers/smtp-email.provider.js";

/**
 * Seleciona o provider de e-mail com base em EMAIL_PROVIDER.
 * env.ts valida as variáveis obrigatórias para cada provedor no boot.
 */
export function createEmailSender(): EmailSender {
  switch (env.email.provider) {
    case "mock":
      return new MockEmailProvider();

    case "http":
      return new HttpEmailProvider({
        apiUrl: env.email.apiUrl!,
        apiKey: env.email.apiKey!,
        from: env.email.from!,
      });

    case "smtp":
      return new SmtpEmailProvider({
        host: env.email.smtp.host!,
        port: env.email.smtp.port,
        secure: env.email.smtp.secure,
        user: env.email.smtp.user!,
        appPassword: env.email.smtp.appPassword!,
        from: env.email.from!,
      });
  }
}
