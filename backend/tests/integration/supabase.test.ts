import { describe, expect, it } from "vitest";

const runSupabaseIntegration =
  process.env.RUN_SUPABASE_INTEGRATION === "true";

describe.skipIf(!runSupabaseIntegration)("Integração com Supabase", () => {
  it("deve conseguir se comunicar com o Supabase Auth", async () => {
    const { supabaseAuth } = await import(
      "../../src/infrastructure/supabase/auth-client.js"
    );

    const { error } = await supabaseAuth.auth.getUser(
      "token-invalido-de-proposito"
    );

    expect(error).not.toBeNull();
    expect(error?.status).toBe(403);
  });
});