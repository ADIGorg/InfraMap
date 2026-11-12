// src/infrastructure/email/email-sender.factory.ts

import { env } from "../../config/env.js";

import type { EmailSender } from "./email-sender.interface.js";

import { HttpEmailProvider } from "./providers/http-email.provider.js";
import { MockEmailProvider } from "./providers/mock-email.provider.js";

/**
 * Seleciona o provider de e-mail com base em `EMAIL_PROVIDER`.
 *
 * `env.ts` já garantiu no boot:
 *  - `EMAIL_PROVIDER` é `mock | http`
 *  - Se `http`, `EMAIL_API_URL`/`EMAIL_API_KEY`/`EMAIL_FROM` estão presentes
 *  - `EMAIL_API_URL` é HTTPS
 *  - `EMAIL_FROM` é um e-mail válido
 */
export function createEmailSender(): EmailSender {
  if (env.email.provider === "mock") {
    return new MockEmailProvider();
  }

  return new HttpEmailProvider({
    apiUrl: env.email.apiUrl!,
    apiKey: env.email.apiKey!,
    from: env.email.from!,
  });
}