import { z } from "zod";

export const getHistorySchema = z.object({
  params: z.object({
    id: z.uuid("ID da ocorrência inválido."),
  }),
});