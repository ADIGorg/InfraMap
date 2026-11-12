import type { OccurrenceStatus } from "../value-objects/occurrence-status.js";
import type { OccurrencePriority } from "../value-objects/occurrence-priority.js";
import type { GeoPoint } from "../value-objects/geo-point.js";

/** Entidade de domínio independente de Supabase, Express e DTOs HTTP. */
export interface Occurrence {
  readonly id: string;
  readonly authorId: string;
  readonly categoryId: string;
  readonly description: string;
  readonly status: OccurrenceStatus;
  readonly priority: OccurrencePriority | null;
  readonly locationOriginal: GeoPoint;
  readonly locationAdjusted: GeoPoint | null;
}
