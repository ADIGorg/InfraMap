import { z } from "zod";

const statusEnum = z.enum([
  "RECEIVED", "UNDER_ANALYSIS", "CONFIRMED", "IN_SERVICE", "RESOLVED", "REJECTED",
]);

const statusQuery = z.preprocess(
  (value) => typeof value === "string" ? value.split(",").map(s => s.trim()) : value,
  z.array(statusEnum).min(1).optional(),
);

const coordinate = (min: number, max: number) =>
  z.preprocess((v) => v === "" ? undefined : v, z.coerce.number().finite().min(min).max(max).optional());

const common = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["recent", "oldest", "most_liked"]).default("recent"),
  categoryId: z.uuid().optional(),
  minLat: coordinate(-90, 90),
  maxLat: coordinate(-90, 90),
  minLng: coordinate(-180, 180),
  maxLng: coordinate(-180, 180),
};

function normalizeQuery(withStatus: boolean) {
  return z.object(withStatus ? { ...common, status: statusQuery } : common)
    .superRefine((query, ctx) => {
      const q = query as typeof query & {
        minLat?: number; maxLat?: number; minLng?: number; maxLng?: number;
      };
      const coords = [q.minLat, q.maxLat, q.minLng, q.maxLng];
      if (coords.some(v => v !== undefined) && coords.some(v => v === undefined)) {
        ctx.addIssue({ code: "custom", message: "Informe os quatro limites da região (bbox)." });
      }
      if (q.minLat !== undefined && q.maxLat !== undefined && q.minLat > q.maxLat) {
        ctx.addIssue({ code: "custom", message: "minLat deve ser <= maxLat." });
      }
      if (q.minLng !== undefined && q.maxLng !== undefined && q.minLng > q.maxLng) {
        ctx.addIssue({ code: "custom", message: "minLng deve ser <= maxLng." });
      }
    })
    .transform(q => {
      const query = q as typeof q & { status?: Array<z.infer<typeof statusEnum>> };
      return {
        page: query.page,
        pageSize: query.pageSize,
        sort: query.sort,
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(withStatus && query.status ? { statuses: query.status } : {}),
        ...(query.minLat !== undefined && query.maxLat !== undefined &&
          query.minLng !== undefined && query.maxLng !== undefined
          ? { bbox: { minLat: query.minLat, maxLat: query.maxLat, minLng: query.minLng, maxLng: query.maxLng } }
          : {}),
      };
    });
}

export const listPublicOccurrencesSchema = z.object({ query: normalizeQuery(false) });
export const listMyOccurrencesSchema = z.object({ query: normalizeQuery(true) });
export const listAdminOccurrencesSchema = z.object({ query: normalizeQuery(true) });

export const occurrenceIdParamSchema = z.object({
  params: z.object({ id: z.uuid("ID da ocorrência inválido.") }),
});
