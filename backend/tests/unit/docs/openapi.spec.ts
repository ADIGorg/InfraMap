import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseDocument } from "yaml";

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOpenApi(): RecordValue {
  const path = fileURLToPath(new URL("../../../docs/openapi.yaml", import.meta.url));
  const parsed = parseDocument(readFileSync(path, "utf8"), { uniqueKeys: true });
  expect(parsed.errors, "O YAML deve ser válido e sem chaves duplicadas").toEqual([]);
  const value: unknown = parsed.toJS();
  expect(isRecord(value)).toBe(true);
  if (!isRecord(value)) throw new Error("OpenAPI inválido.");
  return value;
}

function collectReferences(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectReferences);
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, nested]) => [
    ...(key === "$ref" && typeof nested === "string" ? [nested] : []),
    ...collectReferences(nested),
  ]);
}

describe("OpenAPI — contrato versionado", () => {
  it("tem identificadores únicos e schema 3.1", () => {
    const api = readOpenApi();
    expect(api.openapi).toBe("3.1.0");
    expect(isRecord(api.paths)).toBe(true);
    if (!isRecord(api.paths)) throw new Error("Paths ausentes.");

    const verbs = new Set(["get", "post", "patch", "delete", "put", "options", "head"]);
    const ids: string[] = [];
    for (const item of Object.values(api.paths)) {
      if (!isRecord(item)) continue;
      for (const [verb, operation] of Object.entries(item)) {
        if (!verbs.has(verb)) continue;
        expect(isRecord(operation)).toBe(true);
        if (!isRecord(operation)) continue;
        expect(typeof operation.operationId).toBe("string");
        if (typeof operation.operationId === "string") ids.push(operation.operationId);
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("declara referências locais existentes", () => {
    const api = readOpenApi();
    const components = api.components;
    expect(isRecord(components)).toBe(true);
    if (!isRecord(components)) throw new Error("Components ausentes.");

    for (const ref of collectReferences(api)) {
      if (!ref.startsWith("#/components/")) continue;
      const segments = ref.slice(2).split("/").map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
      let current: unknown = api;
      for (const segment of segments) {
        expect(isRecord(current) && Object.hasOwn(current, segment), `Referência ausente: ${ref}`).toBe(true);
        if (!isRecord(current)) break;
        current = current[segment];
      }
    }
  });

  it("inclui os contratos HTTP dos módulos de ocorrências e moderação", () => {
    const api = readOpenApi();
    if (!isRecord(api.paths)) throw new Error("Paths ausentes.");
    const required = [
      "/occurrences/finalize",
      "/occurrences/public",
      "/occurrences/public/{id}",
      "/occurrences/mine",
      "/occurrences/mine/{id}",
      "/admin/occurrences",
      "/admin/occurrences/{id}",
      "/occurrences/public/{id}/photos/{photoId}",
      "/occurrences/mine/{id}/photos/{photoId}",
      "/admin/occurrences/{id}/photos/{photoId}",
      "/occurrences/{id}/history",
      "/admin/occurrences/{id}/start-analysis",
      "/admin/occurrences/{id}/confirm",
      "/admin/occurrences/{id}/reject",
      "/admin/occurrences/{id}/priority",
      "/admin/occurrences/{id}/start-service",
      "/admin/occurrences/{id}/resolve",
      "/admin/occurrences/{id}/observations",
      "/admin/occurrences/{id}/location",
      "/admin/occurrences/{id}/classification",
    ];
    required.forEach((path) => expect(api.paths).toHaveProperty(path));
  });
});
