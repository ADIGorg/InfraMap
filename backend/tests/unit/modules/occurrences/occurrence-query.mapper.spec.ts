import { describe, expect, it } from "vitest";
import { BadRequestError } from "../../../../src/shared/errors/app-error.js";
import {
  listPublicOccurrencesSchema,
  listAdminOccurrencesSchema,
} from "../../../../src/modules/occurrences/presentation/occurrence-query.schema.js";
import { toOccurrenceListFilters } from "../../../../src/modules/occurrences/presentation/occurrence-query.mapper.js";

describe("toOccurrenceListFilters", () => {
  it("aplica defaults após coercion do Zod", () => {
    const query = listPublicOccurrencesSchema.shape.query.parse({});
    expect(toOccurrenceListFilters(query)).toEqual({
      page: 1, pageSize: 20, sort: "recent",
    });
  });

  it("converte paginação, status em CSV e bounds do mapa", () => {
    const query = listAdminOccurrencesSchema.shape.query.parse({
      page: "3", pageSize: "10",
      status: "RECEIVED,UNDER_ANALYSIS",
      minLat: "-13", maxLat: "-12",
      minLng: "-40", maxLng: "-39",
    });
    expect(toOccurrenceListFilters(query)).toMatchObject({
      page: 3, pageSize: 10,
      statuses: ["RECEIVED", "UNDER_ANALYSIS"],
      bbox: { minLat: -13, maxLat: -12, minLng: -40, maxLng: -39 },
    });
  });

  it("bloqueia bbox incompleta", () => {
    const query = listPublicOccurrencesSchema.shape.query.parse({ minLat: "-12" });
    expect(() => toOccurrenceListFilters(query)).toThrow(BadRequestError);
  });

  it("bloqueia intervalo invertido", () => {
    const query = listPublicOccurrencesSchema.shape.query.parse({
      minLat: "-12", maxLat: "-13", minLng: "-40", maxLng: "-39",
    });
    expect(() => toOccurrenceListFilters(query)).toThrow(BadRequestError);
  });

  it("rejeita status desconhecido", () => {
    const query = listAdminOccurrencesSchema.shape.query.parse({ status: "DONE" });
    expect(() => toOccurrenceListFilters(query)).toThrow(BadRequestError);
  });

  it("não aceita paginação fora do contrato", () => {
    expect(() => listPublicOccurrencesSchema.shape.query.parse({page:"0"})).toThrow();
    expect(() => listPublicOccurrencesSchema.shape.query.parse({pageSize:"101"})).toThrow();
  });
});
