/**
 * QA-02/QA-03: executa Vitest no Supabase LOCAL sem expor nenhuma chave no terminal.
 * Recusa qualquer stack que não esteja vinculada a localhost/127.0.0.1.
 * Uso: npm run test:integration:db | npm run test:e2e
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

function main(): void {
  const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const status = spawnSync(cmd, ["supabase", "status", "-o", "env"], {
    encoding: "utf8",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (status.status !== 0) {
    console.error("Supabase local não iniciado. Execute: npx supabase start");
    process.exit(1);
  }
  const output = status.stdout ?? "";
  const vars = new Map<string, string>();
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (!match) continue;
    let value = match[2] ?? "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    vars.set(match[1]!, value);
  }

  const localUrl = vars.get("API_URL");
  const anon = vars.get("ANON_KEY") || vars.get("PUBLISHABLE_KEY");
  const service = vars.get("SERVICE_ROLE_KEY") || vars.get("SECRET_KEY");
  if (!localUrl || !anon || !service) {
    console.error("A CLI não retornou API_URL, ANON_KEY e SERVICE_ROLE_KEY locais.");
    process.exit(1);
  }
  const url = new URL(localUrl);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
    console.error("PROTEÇÃO QA: testes recusados fora de um Supabase local.");
    process.exit(1);
  }

  const mode = process.argv[2];
  if (mode !== "integration" && mode !== "e2e") {
    console.error("Uso: tsx scripts/run-qa-local.ts integration|e2e");
    process.exit(2);
  }

  const env = {
    ...process.env,
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    AI_PROVIDER: "mock",
    EMAIL_PROVIDER: "mock",
    SUPABASE_URL: localUrl,
    SUPABASE_PUBLISHABLE_KEY: anon,
    SUPABASE_SECRET_KEY: service,
    RUN_SUPABASE_INTEGRATION: "1",
    RUN_E2E: mode === "e2e" ? "1" : "0",
    FORWARDING_PUBLIC_URL_TEMPLATE: "http://localhost:5173/occurrences/{id}",
  };
  const vitest = resolve("node_modules", "vitest", "vitest.mjs");
  const folder = mode === "e2e" ? "tests/e2e" : "tests/integration/supabase";
  console.log(`QA (${mode}): executando ${folder} contra o Supabase local.`);
  const result = spawnSync(process.execPath, [vitest, "run", folder], {
    stdio: "inherit",
    env,
  });
  process.exit(result.status ?? 1);
}

main();
