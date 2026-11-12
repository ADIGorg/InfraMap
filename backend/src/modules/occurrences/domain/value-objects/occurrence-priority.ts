export const OCCURRENCE_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type OccurrencePriority = (typeof OCCURRENCE_PRIORITIES)[number];
