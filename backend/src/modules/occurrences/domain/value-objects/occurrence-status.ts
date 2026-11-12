/** Estados canônicos definidos na especificação e no ENUM PostgreSQL. */
export const OCCURRENCE_STATUSES = [
  "RECEIVED",
  "UNDER_ANALYSIS",
  "CONFIRMED",
  "IN_SERVICE",
  "RESOLVED",
  "REJECTED",
] as const;

export type OccurrenceStatus = (typeof OCCURRENCE_STATUSES)[number];
export const TERMINAL_OCCURRENCE_STATUSES = ["RESOLVED", "REJECTED"] as const;
