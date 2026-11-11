import { z } from "zod";

const positiveInteger = z.string().regex(/^[0-9]+$/).transform(Number).pipe(z.number().int().positive());
export const notificationQuery = z.object({
  page: positiveInteger.pipe(z.number().max(21474836)).default(1),
  limit: positiveInteger.pipe(z.number().max(100)).default(20),
});

export const notificationParams = z.object({ id: z.guid() });
