const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function loadHttp(fetch) {
  const saved = new Map();
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, "../src/shared/http.ts"), "utf8");
  vm.runInNewContext(ts.transpile(source, { module: ts.ModuleKind.CommonJS }), {
    exports,
    require(name) {
      if (name === "react") return { useSyncExternalStore() {} };
      if (name === "expo-secure-store") return {
        getItemAsync: async (key) => saved.get(key),
        setItemAsync: async (key, value) => { saved.set(key, value); },
        deleteItemAsync: async (key) => { saved.delete(key); },
      };
      throw new Error(name);
    },
    fetch, FormData, AbortController, setTimeout, clearTimeout,
    process: { env: {
      EXPO_PUBLIC_API_BASE_URL: "https://api.example.test/api/v1",
      EXPO_PUBLIC_SUPABASE_URL: "https://auth.example.test",
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-test-key",
    } },
  });
  return { http: exports, saved };
}

test("concurrent private calls share one token refresh", async () => {
  let refreshes = 0;
  const { http } = loadHttp(async (url, request) => {
    if (url.includes("refresh_token")) {
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return Response.json({ access_token: "fresh", refresh_token: "next", expires_in: 3600 });
    }
    assert.equal(request.headers.Authorization, "Bearer fresh");
    return Response.json({ data: [] });
  });
  await http.saveSession({ access_token: "expired", refresh_token: "old", expires_in: -1 });
  await Promise.all([http.api("/notifications", { authenticated: true }), http.api("/identity/me", { authenticated: true })]);
  assert.equal(refreshes, 1);
});

test("temporary refresh failure preserves the session for retry", async () => {
  const { http, saved } = loadHttp(async () => new Response(null, { status: 503 }));
  await http.saveSession({ access_token: "expired", refresh_token: "old", expires_in: -1 });
  await assert.rejects(http.api("/identity/me", { authenticated: true }), (error) => error.status === 503);
  assert.equal(saved.size, 1);
});

test("rejected refresh clears credentials", async () => {
  const { http, saved } = loadHttp(async () => new Response(null, { status: 400 }));
  await http.saveSession({ access_token: "expired", refresh_token: "old", expires_in: -1 });
  await assert.rejects(http.api("/identity/me", { authenticated: true }));
  assert.equal(saved.size, 0);
});

test("server errors hide internal messages and mutation requests are not retried", async () => {
  let calls = 0;
  const { http } = loadHttp(async () => {
    calls++;
    return Response.json({ error: { message: "internal storage path" } }, { status: 500 });
  });
  await http.saveSession({ access_token: "valid", refresh_token: "refresh", expires_in: 3600 });
  await assert.rejects(http.api("/occurrences/finalize", {
    authenticated: true, method: "POST", body: {},
  }), (error) => error.status === 500 && !error.message.includes("storage"));
  assert.equal(calls, 1);
});
