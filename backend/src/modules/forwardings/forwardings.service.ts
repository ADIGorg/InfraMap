// src/modules/forwardings/forwardings.service.ts

import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "../../config/env.js";
import { EMAIL_SUBJECT_MAX_LENGTH } from "../../config/constants.js";

import {
  ConflictError,
  NotFoundError,
} from "../../shared/errors/app-error.js";

import type { EmailSender } from "../../infrastructure/email/email-sender.interface.js";

import {
  createForwarding,
  findAgency,
  getOccurrenceForEmail,
  recordForwardingResult,
  type OccurrenceForEmail,
} from "./forwardings.repository.js";

// ============================================================
// Templates de e-mail
// ============================================================
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildSubject(occurrence: OccurrenceForEmail): string {
  const shortId = occurrence.id.slice(0, 8);
  const s = `InfraMap — Ocorrência #${shortId} (${occurrence.categoryName})`;
  return s.length > EMAIL_SUBJECT_MAX_LENGTH
    ? s.slice(0, EMAIL_SUBJECT_MAX_LENGTH)
    : s;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

function buildOccurrenceUrl(occurrenceId: string): string {
  return env.forwarding.publicUrlTemplate.replace("{id}", occurrenceId);
}

function buildEmailBody(
  occurrence: OccurrenceForEmail,
  observations: string | null,
): { text: string; html: string } {
  const shortId = occurrence.id.slice(0, 8);
  const date = formatDate(occurrence.createdAt);
  const lat = occurrence.location.lat.toFixed(6);
  const lng = occurrence.location.lng.toFixed(6);
  const url = buildOccurrenceUrl(occurrence.id);

  const text = [
    "Encaminhamento de ocorrência — InfraMap",
    "",
    `Identificador: ${shortId}`,
    `Categoria: ${occurrence.categoryName} (${occurrence.categoryCode})`,
    `Descrição: ${occurrence.description}`,
    "",
    `Localização: ${lat}, ${lng}`,
    `Data do registro: ${date}`,
    "",
    ...(observations
      ? ["Observações do administrador:", observations, ""]
      : []),
    `Ver no mapa: ${url}`,
    "",
    "---",
    "InfraMap — acompanhamento de infraestrutura urbana",
  ].join("\n");

  const html = `
<div style="font-family:sans-serif;max-width:600px;color:#222;">
  <h2 style="color:#1e3a8a;">Encaminhamento de ocorrência</h2>
  <p><strong>Identificador:</strong> ${shortId}</p>
  <p><strong>Categoria:</strong> ${escapeHtml(occurrence.categoryName)} (${occurrence.categoryCode})</p>
  <p><strong>Descrição:</strong> ${escapeHtml(occurrence.description)}</p>
  <p><strong>Localização:</strong> ${lat}, ${lng}</p>
  <p><strong>Data do registro:</strong> ${date}</p>
  <p><a href="${url}" style="color:#1e3a8a;">Ver no mapa</a></p>
  ${observations ? `<hr/><p><strong>Observações do administrador:</strong></p><p>${escapeHtml(observations)}</p>` : ""}
  <hr/>
  <p style="color:#666;font-size:12px;">InfraMap — acompanhamento de infraestrutura urbana</p>
</div>`.trim();

  return { text, html };
}

// ============================================================
// Orquestração
// ============================================================
export interface ForwardOccurrenceInput {
  agencyId: string;
  observations?: string | undefined;   
}

export interface ForwardOccurrenceResult {
  id: string;
  occurrenceId: string;
  agencyId: string;
  recipientEmail: string;
  subject: string;
  observations: string | null;
  status: "SENT" | "FAILED";
  providerMessageId: string | null;
  errorCode: string | null;
  createdAt: string;
  sentAt: string | null;
}

export async function forwardOccurrence(
  userClient: SupabaseClient,
  emailSender: EmailSender,
  occurrenceId: string,
  input: ForwardOccurrenceInput,
): Promise<ForwardOccurrenceResult> {
  // 1. Órgão existe e está ativo
  const agency = await findAgency(userClient, input.agencyId);
  if (!agency) throw new NotFoundError("Órgão não encontrado.");
  if (!agency.isActive) {
    throw new ConflictError("Órgão inativo não pode receber encaminhamentos.");
  }

  // 2. Ocorrência visível ao admin + status CONFIRMED
  const occurrence = await getOccurrenceForEmail(userClient, occurrenceId);
  if (!occurrence) {
    throw new NotFoundError("Ocorrência não encontrada ou não visível.");
  }
  if (occurrence.status !== "CONFIRMED") {
    throw new ConflictError(
      `Apenas ocorrências CONFIRMED podem ser encaminhadas. Status atual: ${occurrence.status}.`,
    );
  }

  // 3. Subject template
  const subject = buildSubject(occurrence);

  // 4. RPC create_forwarding (valida CONFIRMED + agency ativa novamente — defense in depth)
  const forwardingId = await createForwarding(
    userClient,
    occurrenceId,
    input.agencyId,
    subject,
    input.observations ?? null,
  );

  // 5. Body do e-mail
  const emailBody = buildEmailBody(occurrence, input.observations ?? null);

  // 6. Envio — nunca lança; retorna SENT|FAILED
  const emailResult = await emailSender.send({
    to: agency.email,
    subject,
    body: emailBody,
  });

  // 7. RPC record_forwarding_result (atômica: UPDATE + INSERT history)
  const fwd = await recordForwardingResult(userClient, forwardingId, emailResult);

  return {
    id: fwd.id,
    occurrenceId: fwd.occurrenceId,
    agencyId: fwd.agencyId,
    recipientEmail: fwd.recipientEmail,
    subject: fwd.subject,
    observations: fwd.observations,
    status: fwd.status === "SENT" ? "SENT" : "FAILED",
    providerMessageId: fwd.providerMessageId,
    errorCode: fwd.errorCode,
    createdAt: fwd.createdAt,
    sentAt: fwd.sentAt,
  };
}