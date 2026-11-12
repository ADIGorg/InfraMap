// src/modules/forwardings/forwardings.schema.ts

import { z } from "zod";

export const forwardOccurrenceParamsSchema = z.object({
  id: z.uuid("ID da ocorrência inválido."),
});

/**
 * Body do POST /admin/occurrences/:id/forwardings.
 *
 * `subject` é gerado pelo backend (template fixo) — não aceito no body.
 * `observations` é livre, campo opcional para o admin contextualizar o órgão.
 */
export const forwardOccurrenceBodySchema = z.strictObject({
  agency_id: z.uuid("ID do órgão inválido."),
  observations: z.string().trim().max(2000).optional(),
});