import { BadRequestError } from "../../../shared/errors/app-error.js";
import type {
  ListFilters,
  OccurrenceStatus,
} from "../domain/repositories/occurrence-query.repository.js";
import type { z } from "zod";
import type { listAdminOccurrencesSchema } from "./occurrence-query.schema.js";

type ValidatedQuery = z.infer<typeof listAdminOccurrencesSchema>["query"];
const STATUSES: ReadonlySet<string> = new Set([
  "RECEIVED", "UNDER_ANALYSIS", "CONFIRMED",
  "IN_SERVICE", "RESOLVED", "REJECTED",
]);

export function toOccurrenceListFilters(query: ValidatedQuery): ListFilters {
  const coordinates = [query.minLat, query.maxLat, query.minLng, query.maxLng];
  const count = coordinates.filter((x) => x !== undefined).length;

  if (count !== 0 && count !== 4) {
    throw new BadRequestError("Informe todos os quatro limites geográficos.");
  }
  if (
    count === 4 &&
    (query.minLat! > query.maxLat! || query.minLng! > query.maxLng!)
  ) {
    throw new BadRequestError("Limites geográficos inválidos.");
  }

  const rawStatuses = query.status
    ? (Array.isArray(query.status) ? query.status : query.status.split(","))
    : [];
  const statuses = rawStatuses.map((s) => s.trim()).filter(Boolean);
  if (statuses.some((s) => !STATUSES.has(s))) {
    throw new BadRequestError("Filtro de status inválido.");
  }

  const filters: ListFilters = {
    page: query.page,
    pageSize: query.pageSize,
    sort: query.sort,
  };
  if (query.categoryId) filters.categoryId = query.categoryId;
  if (statuses.length) filters.statuses = [...new Set(statuses)] as OccurrenceStatus[];
  if (count === 4) {
    filters.bbox = {
      minLat: query.minLat!,
      maxLat: query.maxLat!,
      minLng: query.minLng!,
      maxLng: query.maxLng!,
    };
  }
  return filters;
}
