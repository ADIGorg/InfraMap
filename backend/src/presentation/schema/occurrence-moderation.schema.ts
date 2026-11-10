import { z } from 'zod';

export const rejectOccurrenceSchema = z.object({
  body: z.object({
    justification: z.string({ error: 'Justificativa é obrigatória.' })
      .trim()
      .min(10, 'A justificativa deve ter pelo menos 10 caracteres.')
      .max(2000, 'A justificativa deve ter no máximo 2000 caracteres.'),
  }),
  params: z.object({
    id: z.string().uuid('ID da ocorrência inválido.'),
  }),
});