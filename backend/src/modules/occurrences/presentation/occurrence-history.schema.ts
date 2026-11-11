import { z } from 'zod';

export const getHistorySchema = z.object({
  params: z.object({
    id: z.string().uuid('ID da ocorrência inválido.'),
  }),
});