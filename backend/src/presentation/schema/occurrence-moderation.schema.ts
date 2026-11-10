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

export const adjustLocationSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID da ocorrência inválido.'),
  }),
  body: z.object({
    lat: z.number({ message: 'Latitude é obrigatória.' }).min(-90).max(90),
    lng: z.number({ message: 'Longitude é obrigatória.' }).min(-180).max(180),
  }),
});

export const correctClassificationSchema = z
  .object({
    params: z.object({
      id: z.string().uuid('ID da ocorrência inválido.'),
    }),
    body: z.object({
      categoryId: z.string().uuid('ID da categoria inválido.').optional(),
      description: z
        .string()
        .trim()
        .min(1, 'A descrição não pode ser vazia.')
        .max(500, 'A descrição deve ter no máximo 500 caracteres (RN009).')
        .optional(),
    }),
  })
  .refine(
    (data) => Boolean(data.body.categoryId) || Boolean(data.body.description),
    {
      message: 'Informe ao menos uma correção (categoryId ou description).',
      path: ['body'],
    }
  );