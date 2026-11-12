import { describe, expect, it } from "vitest";
import { mapPostgrestError } from "../../../src/shared/errors/map-postgrest-error.js";

describe("mapPostgrestError", () => {
  it.each([
    ["42501", 403],
    ["P0002", 404],
    ["23505", 409],
    ["22023", 400],
    ["PGRST202", 503],
    ["XX000", 500],
  ] as const)("mapeia SQLSTATE %s para HTTP %d", (code, status) => {
    expect(mapPostgrestError({ code, message: "segredo-interno" }).statusCode)
      .toBe(status);
    expect(mapPostgrestError({ code, message: "segredo-interno" }).message)
      .not.toContain("segredo-interno");
  });

  it("trata prefixos SQL legados sem expor detalhes", () => {
    expect(mapPostgrestError({ message: "CONFLICT: detalhes privados" }).statusCode)
      .toBe(409);
  });
});
