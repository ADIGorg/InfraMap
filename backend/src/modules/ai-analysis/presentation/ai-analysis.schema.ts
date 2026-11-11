import { z } from "zod";
import { BadRequestError } from "../../../shared/errors/app-error.js";

export const aiAnalysisParamsSchema = z.object({
  id: z.string().uuid("Identificador da análise inválido."),
});

export function parseAiAnalysisId(value: unknown): string {
  const result = aiAnalysisParamsSchema.shape.id.safeParse(value);
  if (!result.success) throw new BadRequestError("Identificador da análise inválido.");
  return result.data;
}
