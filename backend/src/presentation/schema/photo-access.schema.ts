import { z } from 'zod';

export const photoAccessParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID da ocorrência inválido.'),
    photoId: z.string().uuid('ID da foto inválido.'),
  }),
});