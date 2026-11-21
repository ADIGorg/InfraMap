// src/modules/forwardings/forwardings.service.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import { createForwardingPdfAttachment } from "./forwarding-pdf.service.js";
import { reverseGeocodeForEmail } from "../../infrastructure/geocoding/reverse-geocode.js";

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

function buildGoogleMapsUrl(lat: number, lng: number): string {
  const coordinates = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`;
}

function buildEmailBody(
  occurrence: OccurrenceForEmail,
  observations: string | null,
  address: string | null,
): { text: string; html: string } {
  const shortId = occurrence.id.slice(0, 8);
  const date = formatDate(occurrence.createdAt);
  const lat = occurrence.location.lat.toFixed(6);
  const lng = occurrence.location.lng.toFixed(6);
  const url = buildGoogleMapsUrl(occurrence.location.lat, occurrence.location.lng);

  const text = [
    "Encaminhamento de ocorrência — InfraMap",
    "",
    "Prezados(as),",
    "Encaminhamos para análise e providências cabíveis a ocorrência identificada abaixo.",
    "O relatório completo, incluindo as evidências fotográficas, segue anexo em PDF.",
    "",
    `Identificador: ${shortId}`,
    `Categoria: ${occurrence.categoryName} (${occurrence.categoryCode})`,
    `Descrição: ${occurrence.description}`,
    "",
    `Endereço aproximado: ${address ?? "Não identificado"}`,
    `Coordenadas: ${lat}, ${lng}`,
    `Data do registro: ${date}`,
    "",
    ...(observations
      ? ["Observações do administrador:", observations, ""]
      : []),
    `Abrir localização no Google Maps: ${url}`,
    ...(address ? ["Endereço obtido a partir de dados do OpenStreetMap contributors."] : []),
    "",
    "---",
    "InfraMap — acompanhamento de infraestrutura urbana",
  ].join("\n");

  const html = `
<div style="font-family:sans-serif;max-width:600px;color:#222;">
  <h2 style="color:#1e3a8a;">Encaminhamento de ocorrência</h2>
  <p>Prezados(as),</p>
  <p>Encaminhamos para análise e providências cabíveis a ocorrência identificada abaixo. O relatório completo, incluindo as evidências fotográficas, segue anexo em PDF.</p>
  <p><strong>Identificador:</strong> ${shortId}</p>
  <p><strong>Categoria:</strong> ${escapeHtml(occurrence.categoryName)} (${occurrence.categoryCode})</p>
  <p><strong>Descrição:</strong> ${escapeHtml(occurrence.description)}</p>
  <p><strong>Endereço aproximado:</strong> ${escapeHtml(address ?? "Não identificado")}</p>
  <p><strong>Coordenadas:</strong> ${lat}, ${lng}</p>
  <p><strong>Data do registro:</strong> ${date}</p>
  <p><a href="${url}" style="color:#1e3a8a;">Abrir localização no Google Maps</a></p>
  ${address ? '<p style="color:#666;font-size:11px;">Endereço obtido de dados do OpenStreetMap contributors.</p>' : ""}
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
  adminClient: SupabaseClient,
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

  // Gera o PDF com fotografias antes do registro do encaminhamento.
  const address = await reverseGeocodeForEmail(occurrence.location);
  const emailBody = buildEmailBody(occurrence, input.observations ?? null, address);
  const report = await createForwardingPdfAttachment(adminClient, {
    occurrence, agencyName: agency.name, address,
    observations: input.observations ?? null,
    mapsUrl: buildGoogleMapsUrl(occurrence.location.lat, occurrence.location.lng),
  });

  // Só registra o forwarding depois que o documento estiver completo.
  const forwardingId = await createForwarding(
    userClient,
    occurrenceId,
    input.agencyId,
    subject,
    input.observations ?? null,
  );

  // 6. Envio — nunca lança; retorna SENT|FAILED
  const emailResult = await emailSender.send({
    to: agency.email,
    subject,
    body: emailBody,
    attachments: [{ filename: report.filename, content: report.contentBase64, contentType: report.contentType }],
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