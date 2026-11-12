import { z } from 'zod';

export const photoAccessParamsSchema = z.object({
  params: z.object({
    id: z.uuid('ID da ocorrência inválido.'),
    photoId: z.uuid('ID da foto inválido.'),
  }),
});