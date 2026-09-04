import pino from "pino";
import type { Env } from "../config/env.js";

export function createLogger(env: Env) {
  return pino({
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "*.password",
        "*.accessToken",
        "*.accessTokenCipher",
        "*.refreshToken",
      ],
      censor: "[REDACTED]",
    },
  });
}

export type Logger = ReturnType<typeof createLogger>;
