import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().default(3333),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  PUBLIC_WEB_URL: z.string().url(),
  PUBLIC_ADMIN_URL: z.string().url(),

  DATABASE_URL: z.string().min(1),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  REDIS_URL: z.string().min(1),

  SECRETS_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, {
      message: "must be 32 bytes, base64-encoded",
    }),

  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_OAUTH_REDIRECT_URI: z.string().url().optional(),
  META_GRAPH_VERSION: z.string().default("v21.0"),

  MAIL_DRIVER: z.enum(["noop", "resend", "ses", "smtp"]).default("noop"),
  MAIL_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default("Portal <no-reply@portal.com.br>"),

  AI_PROVIDER: z.enum(["noop", "openai", "anthropic"]).default("noop"),
  AI_API_KEY: z.string().optional(),

  SENTRY_DSN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Validates process.env once and caches the result. Throws early on boot if misconfigured. */
export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("✗ invalid environment configuration:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  cached = parsed.data;
  return cached;
}
