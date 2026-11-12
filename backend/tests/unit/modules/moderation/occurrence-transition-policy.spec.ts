import { describe, expect, it } from "vitest";
import { canTransitionOccurrence } from "../../../../src/modules/moderation/domain/services/occurrence-transition-policy.js";

describe("occurrence-transition-policy", () => {
  it.each([
    ["RECEIVED", "UNDER_ANALYSIS"],
    ["UNDER_ANALYSIS", "CONFIRMED"],
    ["UNDER_ANALYSIS", "REJECTED"],
    ["CONFIRMED", "IN_SERVICE"],
    ["IN_SERVICE", "RESOLVED"],
  ] as const)("%s → %s é permitido", (from, to) => {
    expect(canTransitionOccurrence(from, to)).toBe(true);
  });

  it.each([
    ["RECEIVED", "CONFIRMED"],
    ["CONFIRMED", "RESOLVED"],
    ["REJECTED", "UNDER_ANALYSIS"],
    ["RESOLVED", "RECEIVED"],
    ["IN_SERVICE", "REJECTED"],
  ] as const)("%s → %s é rejeitado", (from, to) => {
    expect(canTransitionOccurrence(from, to)).toBe(false);
  });
});
