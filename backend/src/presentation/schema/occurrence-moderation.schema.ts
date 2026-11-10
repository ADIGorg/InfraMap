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
export const setPrioritySchema = z.object({
  body: z.object({
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH'], {
      message: 'Prioridade deve ser LOW, MEDIUM ou HIGH (RN034).',
    }),
  }),
  params: z.object({
    id: z.string().uuid('ID da ocorrência inválido.'),
  }),
});

export const startServiceSchema = z.object({
  body: z.object({
    actionNotes: z
      .string({ message: 'É obrigatório registrar a ação concreta do atendimento (RN061).' })
      .trim()
      .min(10, 'A ação concreta deve ter pelo menos 10 caracteres.')
      .max(2000, 'A ação concreta deve ter no máximo 2000 caracteres.'),
  }),
  params: z.object({
    id: z.string().uuid('ID da ocorrência inválido.'),
  }),
});

export const resolveOccurrenceSchema = z.object({
  body: z.object({
    resolutionNotes: z.string().trim().max(2000).optional(),
  }),
  params: z.object({
    id: z.string().uuid('ID da ocorrência inválido.'),
  }),
});

export const createObservationSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID da ocorrência inválido.'),
  }),
  body: z.object({
    content: z
      .string({ message: 'O conteúdo da observação é obrigatório.' })
      .trim()
      .min(5, 'O conteúdo deve ter pelo menos 5 caracteres.')
      .max(2000, 'O conteúdo deve ter no máximo 2000 caracteres.'),
    visibility: z.enum(['INTERNAL', 'CITIZEN_RESPONSE'], {
      message: 'Visibilidade deve ser INTERNAL ou CITIZEN_RESPONSE (RN044).',
    }),
  }),
});