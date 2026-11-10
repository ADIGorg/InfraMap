import { z } from 'zod';

const commonQuery = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['recent', 'oldest', 'most_liked']).default('recent'),
  categoryId: z.string().uuid().optional(),
  minLat: z.coerce.number().min(-90).max(90).optional(),
  maxLat: z.coerce.number().min(-90).max(90).optional(),
  minLng: z.coerce.number().min(-180).max(180).optional(),
  maxLng: z.coerce.number().min(-180).max(180).optional(),
};

// PUBLIC — sem filtro de status (sempre CONFIRMED/IN_SERVICE)
export const listPublicOccurrencesSchema = z.object({
  query: z.object(commonQuery),
});

// MINE — cidadão pode filtrar status
export const listMyOccurrencesSchema = z.object({
  query: z.object({
    ...commonQuery,
    status: z.union([z.string(), z.array(z.string())]).optional(),
  }),
});

// ADMIN — filtro amplo
export const listAdminOccurrencesSchema = z.object({
  query: z.object({
    ...commonQuery,
    status: z.union([z.string(), z.array(z.string())]).optional(),
  }),
});

export const occurrenceIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID da ocorrência inválido.'),
  }),
});