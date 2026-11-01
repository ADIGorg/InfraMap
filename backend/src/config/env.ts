import "dotenv/config";

const requiredVariables = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
] as const;

const missingVariables = requiredVariables.filter(
  (variable) => !process.env[variable]?.trim()
);

if (missingVariables.length > 0) {
  throw new Error(
    `Variáveis de ambiente obrigatórias ausentes: ${missingVariables.join(", ")}`
  );
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,

  supabase: {
    url: process.env.SUPABASE_URL!,
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY!,
  },
};