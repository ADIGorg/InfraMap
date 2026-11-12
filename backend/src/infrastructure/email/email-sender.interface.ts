// src/infrastructure/email/email-sender.interface.ts

/**
 * Contrato de envio de e-mail — FWD-01.
 *
 * Provider-agnostic. A API da aplicação (FWD-02) usa esta interface
 * e nunca importa um provider concreto.
 *
 * Semântica de retorno:
 *  - Sucesso            → { status: "SENT", providerMessageId? }
 *  - Falha do provedor  → { status: "FAILED", errorCode? }   ← retorno, não throw
 *
 * O CALLER (use case de forwarding) usa `status` + `errorCode` para
 * atualizar `forwardings.status`, `forwardings.error_code` e o histórico.
 *
 * INPUT inválido (destinatário/assunto/corpo malformado) → throw
 * `AppError(400, "EMAIL_INVALID_INPUT")`. Não é falha do provedor —
 * é erro do programador, nunca chega a uma tentativa persistida.
 */
export interface EmailInput {
  /** Destinatário. MIME `RFC 5322`-básico. */
  to: string;
  /** Assunto. 1 a 200 caracteres. */
  subject: string;
  body: {
    /** Corpo em texto puro — obrigatório. */
    text: string;
    /** Corpo HTML — opcional. */
    html?: string;
  };
}

export interface EmailResult {
  status: "SENT" | "FAILED";
  /** ID retornado pelo provedor quando disponível. */
  providerMessageId?: string;
  /** Código curto da falha — armazenado em `forwardings.error_code`. */
  errorCode?: string;
}

export interface EmailSender {
  send(input: EmailInput): Promise<EmailResult>;
}