import type { OccurrenceStatus } from "../../../occurrences/domain/value-objects/occurrence-status.js";

/** Máquina de estados canônica do MVP, sem exceções HTTP no domínio. */
const TRANSITIONS: Readonly<Record<OccurrenceStatus, readonly OccurrenceStatus[]>> = {
  RECEIVED: ["UNDER_ANALYSIS"],
  UNDER_ANALYSIS: ["CONFIRMED", "REJECTED"],
  CONFIRMED: ["IN_SERVICE"],
  IN_SERVICE: ["RESOLVED"],
  RESOLVED: [],
  REJECTED: [],
};

export function canTransitionOccurrence(
  current: string,
  target: OccurrenceStatus,
): boolean {
  if (!Object.prototype.hasOwnProperty.call(TRANSITIONS, current)) return false;
  return TRANSITIONS[current as OccurrenceStatus].includes(target);
}
