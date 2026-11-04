
import "dotenv/config";
import pino from "pino";

// Níveis de log reconhecidos pelo Pino.
const validLevels = new Set([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
]);

const requestedLevel = process.env.LOG_LEVEL;

const logLevel =
  requestedLevel && validLevels.has(requestedLevel)
    ? requestedLevel
    : process.env.NODE_ENV === "production"
      ? "info"
      : "debug";

// Logger centralizado da aplicação.
export const logger = pino({
  name: "inframap-api",

  // Define o nível mínimo de severidade registrado.
  level: logLevel,

  // Registra data e hora no padrão ISO 8601.
  timestamp: pino.stdTimeFunctions.isoTime,

  // Mascaramento adicional de dados sensíveis.
  redact: {
    paths: [
      "password",
      "token",
      "accessToken",
      "refreshToken",
      "authorization",
      "cookie",
      "headers.authorization",
      "headers.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
      "body.password",
      "body.token",
      "body.access_token",
      "body.refresh_token",
    ],
    censor: "[REDACTED]",
  },
});
