const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

test("finalization uses uploaded photo order, backend paths and reviewed field sources", async () => {
  const calls = [];
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, "../src/features/occurrence-report/reportApi.ts"), "utf8");
  vm.runInNewContext(ts.transpile(source, { module: ts.ModuleKind.CommonJS }), {
    exports, FormData,
    require: () => ({ api: async (route, options) => {
      calls.push({ route, options });
      return route === "/app/me" ? { id: "citizen-id" } : { data: { id: "occurrence-id", status: "RECEIVED" } };
    } }),
  });
  const result = await exports.finalize({
    photos: [
      { uri: "file:///one.jpg", mimeType: "image/jpeg", sizeBytes: 123 },
      { uri: "file:///two.png", mimeType: "image/png", sizeBytes: 456 },
    ],
    analysis: { id: "analysis-id", category_code: "CAT01", suggested_description: "Original" },
    category: { id: "category-id", code: "CAT02" },
    description: "Original",
    location: { lat: -23.5, lng: -46.6 },
  });
  const payload = calls[1].options.body;
  assert.equal(calls[1].route, "/occurrences/finalize");
  assert.equal(payload.photos[0].storagePath, "temporary/citizen-id/analysis-id/photo-1.jpg");
  assert.equal(payload.photos[1].storagePath, "temporary/citizen-id/analysis-id/photo-2.png");
  assert.equal(payload.categorySource, "AI_EDITED");
  assert.equal(payload.descriptionSource, "AI_CONFIRMED");
  assert.equal(payload.location.lng, -46.6);
  assert.equal(result.data.status, "RECEIVED");
});
