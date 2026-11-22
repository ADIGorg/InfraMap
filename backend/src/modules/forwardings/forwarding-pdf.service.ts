/**
 * Relatório documental do encaminhamento. Acesso exclusivo do backend, após
 * autenticação ADMIN, confirmação da ocorrência e validação do órgão ativo.
 * Não cria URLs públicas para fotos nem persiste arquivos temporários.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../shared/errors/app-error.js";
import { MAX_PHOTO_SIZE_BYTES, OCCURRENCE_PHOTOS_MAX, STORAGE_BUCKET_NAME } from "../../config/constants.js";
import type { OccurrenceForEmail } from "./forwardings.repository.js";

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const CONTENT_WIDTH = A4[0] - MARGIN * 2;
const MAX_PDF_BYTES = 24 * 1024 * 1024;
const NAVY = rgb(0.08, 0.23, 0.35);
const TEAL = rgb(0.19, 0.67, 0.62);
const MUTED = rgb(0.32, 0.39, 0.45);

export interface ForwardingPdfInput {
  occurrence: OccurrenceForEmail;
  agencyName: string;
  address: string | null;
  observations: string | null;
  mapsUrl: string;
  emittedAt?: Date;
}

export interface PdfAttachment {
  filename: string;
  contentBase64: string;
  contentType: "application/pdf";
}

/** Limita caracteres a WinAnsi, suportado pela Helvetica embarcada no pdf-lib. */
function printable(value: string, font: PDFFont): string {
  return [...value.replace(/\r/g, "")].map((char) => {
    if (char === "\n") return char;
    try { font.encodeText(char); return char; } catch { return "?"; }
  }).join("");
}

function splitLines(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of printable(text, font).split("\n")) {
    let current = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) { current = candidate; continue; }
      if (current) { lines.push(current); current = ""; }
      for (const letter of word) {
        if (font.widthOfTextAtSize(current + letter, size) > width && current) {
          lines.push(current);
          current = "";
        }
        current += letter;
      }
    }
    lines.push(current);
  }
  return lines;
}

function googleDate(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short",
  }).format(new Date(date));
}

function priorityLabel(value: OccurrenceForEmail["priority"]): string {
  return value === "HIGH" ? "Alta" : value === "MEDIUM" ? "Média" : value === "LOW" ? "Baixa" : "Não definida";
}

export async function generateForwardingPdf(
  input: ForwardingPdfInput,
  photos: Array<{ position: number; mimeType: string; bytes: Uint8Array }>,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`InfraMap - Relatório de ocorrência ${input.occurrence.id}`);
  pdf.setAuthor("InfraMap");
  pdf.setSubject("Encaminhamento administrativo de ocorrência urbana");
  pdf.setCreator("InfraMap Backend");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage;
  let y = 0;

  function addPage(): PDFPage {
    const p = pdf.addPage(A4);
    p.drawRectangle({ x: 0, y: A4[1] - 112, width: A4[0], height: 112, color: NAVY });
    p.drawRectangle({ x: 0, y: A4[1] - 116, width: A4[0], height: 4, color: TEAL });
    p.drawText("InfraMap", { x: MARGIN, y: A4[1] - 54, size: 24, font: bold, color: rgb(1, 1, 1) });
    p.drawText("RELATÓRIO DE ENCAMINHAMENTO DE OCORRÊNCIA", {
      x: MARGIN, y: A4[1] - 79, size: 10.2, font: bold, color: rgb(1, 1, 1),
    });
    p.drawText(`Protocolo: ${input.occurrence.id}`, {
      x: MARGIN, y: A4[1] - 97, size: 8.5, font: regular, color: rgb(0.84, 0.92, 0.94),
    });
    return p;
  }
  function needs(height: number): void {
    if (y - height < 67) { page = addPage(); y = A4[1] - 141; }
  }
  function heading(name: string): void {
    needs(34);
    page.drawText(printable(name.toUpperCase(), bold), {
      x: MARGIN, y, size: 11.5, font: bold, color: NAVY,
    });
    y -= 9;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_WIDTH, y }, thickness: 1, color: TEAL });
    y -= 21;
  }
  function field(label: string, value: string): void {
    const lines = splitLines(value || "Não informado", regular, 10.5, CONTENT_WIDTH);
    needs(19 + lines.length * 14);
    page.drawText(printable(label, bold), { x: MARGIN, y, size: 9.5, font: bold, color: MUTED });
    y -= 15;
    for (const line of lines) {
      needs(14);
      page.drawText(line, { x: MARGIN, y, size: 10.5, font: regular, color: NAVY });
      y -= 14;
    }
    y -= 9;
  }

  page = addPage();
  y = A4[1] - 142;
  heading("01 — Identificação e encaminhamento");
  field("Identificador completo", input.occurrence.id);
  field("Órgão destinatário", input.agencyName);
  field("Categoria", `${input.occurrence.categoryName} (${input.occurrence.categoryCode})`);
  field("Situação / prioridade", `Confirmada / ${priorityLabel(input.occurrence.priority)}`);
  field("Registrada em", googleDate(input.occurrence.createdAt));
  field("Documento emitido em", googleDate(input.emittedAt ?? new Date()));
  heading("02 — Descrição da ocorrência");
  field("Descrição registrada", input.occurrence.description);
  heading("03 — Localização geográfica");
  field("Endereço aproximado", input.address ?? "Endereço não identificado; utilize as coordenadas abaixo.");
  field("Coordenadas de referência", `${input.occurrence.location.lat.toFixed(6)}, ${input.occurrence.location.lng.toFixed(6)}`);
  field("Abrir no Google Maps (URL pública)", input.mapsUrl);
  heading("04 — Observações para o órgão");
  field("Observações do administrador", input.observations?.trim() || "Nenhuma observação adicional.");

  for (const [index, photo] of photos.entries()) {
    page = addPage();
    y = A4[1] - 149;
    heading(`05 — Evidência fotográfica ${index + 1} de ${photos.length}`);
    field("Referência", `Foto de posição ${photo.position}, incorporada a este documento.`);
    const image = photo.mimeType === "image/jpeg"
      ? await pdf.embedJpg(photo.bytes)
      : await pdf.embedPng(photo.bytes);
    const maxWidth = CONTENT_WIDTH;
    const maxHeight = y - 108;
    const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const width = image.width * ratio;
    const height = image.height * ratio;
    page.drawImage(image, { x: MARGIN + (CONTENT_WIDTH - width) / 2, y: y - height, width, height });
    y -= height + 20;
    field("Nota", "Evidência encaminhada exclusivamente ao órgão responsável para análise da ocorrência.");
  }

  for (const [i, p] of pdf.getPages().entries()) {
    p.drawLine({ start: { x: MARGIN, y: 50 }, end: { x: A4[0] - MARGIN, y: 50 }, thickness: 0.5, color: MUTED });
    p.drawText("InfraMap — documento de apoio ao atendimento. Não constitui laudo pericial.", {
      x: MARGIN, y: 36, size: 8, font: regular, color: MUTED,
    });
    p.drawText(`${i + 1}/${pdf.getPageCount()}`, { x: A4[0] - MARGIN - 25, y: 36, size: 8, font: regular, color: MUTED });
  }
  return pdf.save({ useObjectStreams: true });
}

export async function createForwardingPdfAttachment(
  adminClient: SupabaseClient,
  input: ForwardingPdfInput,
): Promise<PdfAttachment> {
  const metas = input.occurrence.photos;
  if (!metas?.length || metas.length > OCCURRENCE_PHOTOS_MAX) {
    throw new AppError(409, "REPORT_PHOTOS_MISSING", "A ocorrência precisa ter suas evidências disponíveis antes de ser encaminhada.");
  }
  const photos: Array<{ position: number; mimeType: string; bytes: Uint8Array }> = [];
  const sorted = [...metas].sort((a, b) => a.position - b.position);
  for (const photo of sorted) {
    if (!["image/jpeg", "image/png"].includes(photo.mimeType) ||
        (photo.sizeBytes != null && (photo.sizeBytes <= 0 || photo.sizeBytes > MAX_PHOTO_SIZE_BYTES))) {
      throw new AppError(409, "REPORT_PHOTO_INVALID", "Uma evidência fotográfica está inválida para o relatório.");
    }
    const { data, error } = await adminClient.storage.from(STORAGE_BUCKET_NAME).download(photo.storagePath);
    if (error || !data) {
      throw new AppError(409, "REPORT_PHOTO_UNAVAILABLE", "Uma fotografia não pôde ser recuperada. O encaminhamento não foi enviado.");
    }
    const bytes = new Uint8Array(await data.arrayBuffer());
    if (!bytes.length || bytes.byteLength > MAX_PHOTO_SIZE_BYTES) {
      throw new AppError(409, "REPORT_PHOTO_INVALID", "Uma fotografia excede o tamanho permitido.");
    }
    photos.push({ position: photo.position, mimeType: photo.mimeType, bytes });
  }
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateForwardingPdf(input, photos);
  } catch {
    throw new AppError(500, "REPORT_GENERATION_FAILED", "Não foi possível gerar o relatório PDF com as evidências.");
  }
  if (pdfBytes.length > MAX_PDF_BYTES) {
    throw new AppError(413, "REPORT_TOO_LARGE", "O relatório excedeu o tamanho permitido para envio por e-mail.");
  }
  return {
    filename: `InfraMap-Ocorrencia-${input.occurrence.id.slice(0, 8).toUpperCase()}.pdf`,
    contentType: "application/pdf",
    contentBase64: Buffer.from(pdfBytes).toString("base64"),
  };
}
