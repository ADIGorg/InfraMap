import { describe, it, expect } from "vitest";
import { parseGeoPoint } from "../../../../src/modules/occurrences/infrastructure/repositories/supabase-occurrence-query.repository.js";
describe("Geographic contract", () => {
  it("reads GeoJSON longitude-first, output latitude-first", () => {
    expect(parseGeoPoint({type:"Point",coordinates:[-38.97,-12.26]}))
      .toEqual({lat:-12.26,lng:-38.97});
  });
  it("accepts normalized lat/lng", () => {
    expect(parseGeoPoint({lat:-12.26,lng:-38.97})).toEqual({lat:-12.26,lng:-38.97});
  });
  it("rejects unknown PostGIS formats instead of returning 0,0", () => {
    expect(() => parseGeoPoint(null)).toThrow();
    expect(() => parseGeoPoint("0101000020E6100000")).toThrow();
    expect(() => parseGeoPoint({type:"Point",coordinates:[181,0]})).toThrow();
  });
});
