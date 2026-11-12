import { z } from "zod";

import {
  OCCURRENCE_PHOTO_MIME_TYPES,
  OCCURRENCE_PHOTOS_MAX,
  OCCURRENCE_PHOTOS_MIN,
} from "../../.././config/constants.js";

const dataSourceSchema = z.enum(
  ["AI_CONFIRMED", "AI_EDITED", "USER_MANUAL"],
  { message: "Fonte deve ser AI_CONFIRMED, AI_EDITED ou USER_MANUAL (RN068)." },
);

const photoSchema = z.object({
  storagePath: z.string().min(1, "O caminho da foto é obrigatório."),
  mimeType: z.enum(OCCURRENCE_PHOTO_MIME_TYPES, {
    message: "As fotos devem ser JPEG ou PNG (RN010).",
  }),
  sizeBytes: z.number().positive("Tamanho da foto deve ser positivo."),
});

export const finalizeOccurrenceSchema = z.object({
  body: z.object({
    aiAnalysisId: z.uuid("ID da análise inválido."),
    categoryId: z.uuid("ID da categoria inválido."),
    description: z
      .string()
      .trim()
      .min(1, "Descrição é obrigatória (RN009).")
      .max(500, "Descrição deve ter no máximo 500 caracteres (RN009)."),
    location: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    categorySource: dataSourceSchema,
    descriptionSource: dataSourceSchema,
    photos: z
      .array(photoSchema)
      .min(OCCURRENCE_PHOTOS_MIN, `Pelo menos ${OCCURRENCE_PHOTOS_MIN} foto é obrigatória (RN010).`)
      .max(OCCURRENCE_PHOTOS_MAX, `No máximo ${OCCURRENCE_PHOTOS_MAX} fotos são permitidas (RN010).`),
  }),
});