/**
 * QA-03: somente Supabase LOCAL. Nunca aceita URL de produção.
 * Executar com `npm run test:e2e`, após `supabase start`.
 */
import { execFileSync, spawnSync } from "node:child_process";

function getStatus(): string {
  try {
    return execFileSync("supabase", ["status", "-o", "env"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    const bin = process.platform === "win32" ? "npx.cmd" : "npx";
    return execFileSync(bin, ["--yes", "supabase", "status", "-o", "env"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
  }
}

try {
  const values = new Map<string, string>();
  for (const line of getStatus().split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2]!.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values.set(match[1]!, value);
  }

  const url = values.get("API_URL") ?? values.get("SUPABASE_URL");
  const anon = values.get("ANON_KEY") ?? values.get("PUBLISHABLE_KEY");
  const service = values.get("SERVICE_ROLE_KEY") ?? values.get("SECRET_KEY");
  if (!url || !anon || !service) {
    throw new Error("Supabase local não disponibilizou API_URL, ANON_KEY e SERVICE_ROLE_KEY.");
  }
  const parsed = new URL(url);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) || !["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Testes E2E BLOQUEADOS: somente Supabase com endereço loopback é permitido.");
  }

  const env = {
    ...process.env,
    NODE_ENV: "test",
    E2E_LOCAL: "1",
    SUPABASE_URL: url,
    SUPABASE_PUBLISHABLE_KEY: anon,
    SUPABASE_SECRET_KEY: service,
    AI_PROVIDER: "mock",
    EMAIL_PROVIDER: "mock",
    LOG_LEVEL: "silent",
  };
  const run = spawnSync(
    process.execPath,
    ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.e2e.config.ts"],
    { env, stdio: "inherit" },
  );
  process.exit(run.status ?? 1);
} catch (error) {
  process.stderr.write(
    "QA-03: Supabase local indisponível ou inseguro. Inicie com 'npx supabase start'.\n" +
    (error instanceof Error ? error.message : String(error)) + "\n",
  );
  process.exit(1);
}
