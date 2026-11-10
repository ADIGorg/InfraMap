import { z } from 'zod';

const dataSourceSchema = z.enum(['AI_CONFIRMED', 'AI_EDITED', 'MANUAL'], {
  message: 'Fonte deve ser AI_CONFIRMED, AI_EDITED ou MANUAL (RN068).',
});

const photoSchema = z.object({
  storagePath: z.string().min(1, 'O caminho da foto é obrigatório.'),
  mimeType: z.enum(['image/jpeg', 'image/jpg'], {
    message: 'As fotos devem ser JPG/JPEG (RN010).',
  }),
  sizeBytes: z.number().positive('Tamanho da foto deve ser positivo.'),
});

export const finalizeOccurrenceSchema = z.object({
  body: z.object({
    aiAnalysisId: z.string().uuid('ID da análise inválido.'),
    categoryId: z.string().uuid('ID da categoria inválido.'),
    description: z
      .string()
      .trim()
      .min(1, 'Descrição é obrigatória (RN009).')
      .max(500, 'Descrição deve ter no máximo 500 caracteres (RN009).'),
    location: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    categorySource: dataSourceSchema,
    descriptionSource: dataSourceSchema,
    photos: z
      .array(photoSchema)
      .min(1, 'Pelo menos 1 foto é obrigatória (RN010).')
      .max(3, 'No máximo 3 fotos são permitidas (RN010).'),
  }),
});