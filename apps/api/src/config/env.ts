/**
 * Phase 16: Zod-validated environment configuration.
 *
 * Validates ALL environment variables at startup and fails fast with
 * clear error messages if required values are missing or malformed.
 *
 * Usage:
 *   import { ENV } from "./config/env.js";
 *   // ENV.VISTA_HOST, ENV.PORT, etc. — all typed + validated
 */

import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */

const envSchema = z.object({
  // ---- Server ----
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default("127.0.0.1"),

  // ---- VistA RPC Broker ----
  VISTA_HOST: z.string().default("127.0.0.1"),
  VISTA_PORT: z.coerce.number().int().min(1).max(65535).default(9430),
  VISTA_ACCESS_CODE: z.string().min(1, "VISTA_ACCESS_CODE is required").optional(),
  VISTA_VERIFY_CODE: z.string().min(1, "VISTA_VERIFY_CODE is required").optional(),
  VISTA_CONTEXT: z.string().default("OR CPRS GUI CHART"),

  // ---- Build metadata ----
  BUILD_SHA: z.string().default("dev"),
  BUILD_TIME: z.string().default("unknown"),

  // ---- Security ----
  ALLOWED_ORIGINS: z.string().optional(),
  SESSION_COOKIE: z.string().default("ehr_session"),
  SESSION_ABSOLUTE_TTL_MS: z.coerce.number().int().positive().default(8 * 60 * 60 * 1000),
  SESSION_IDLE_TTL_MS: z.coerce.number().int().positive().default(30 * 60 * 1000),

  // ---- Logging ----
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  LOG_FORMAT: z.enum(["json", "text"]).default("json"),

  // ---- Audit ----
  AUDIT_SINK: z.enum(["memory", "file", "stdout"]).default("memory"),
  AUDIT_FILE_PATH: z.string().default("logs/audit.jsonl"),
  AUDIT_MAX_ENTRIES: z.coerce.number().int().positive().default(5000),
  AUDIT_RETENTION_DAYS: z.coerce.number().int().min(0).default(365),

  // ---- RPC resilience ----
  RPC_CALL_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  RPC_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  RPC_CB_THRESHOLD: z.coerce.number().int().positive().default(5),
  RPC_CB_RESET_MS: z.coerce.number().int().positive().default(30_000),
  RPC_MAX_RETRIES: z.coerce.number().int().min(0).default(2),
  RPC_RETRY_DELAY_MS: z.coerce.number().int().positive().default(1000),

  // ---- Cache ----
  CACHE_DEFAULT_TTL_MS: z.coerce.number().int().positive().default(60_000),
  CACHE_DEMOGRAPHICS_TTL_MS: z.coerce.number().int().positive().default(300_000),
  CACHE_LIST_TTL_MS: z.coerce.number().int().positive().default(30_000),
  CACHE_MAX_ENTRIES: z.coerce.number().int().positive().default(500),

  // ---- Rate Limiting ----
  RATE_LIMIT_GENERAL: z.coerce.number().int().positive().default(200),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_LOGIN: z.coerce.number().int().positive().default(10),
});

export type EnvConfig = z.infer<typeof envSchema>;

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

let _env: EnvConfig | null = null;

/**
 * Validate and return typed environment config.
 * Throws on first call if env is invalid; caches result for subsequent calls.
 */
export function getEnv(): EnvConfig {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${errors}\n\nSee apps/api/.env.example for reference.`);
  }

  _env = result.data;
  return _env;
}

/**
 * Quick accessor — same as getEnv() but reads cleaner.
 * Import as: import { ENV } from "./config/env.js";
 * Then use ENV.PORT, ENV.VISTA_HOST, etc.
 */
export const ENV = new Proxy({} as EnvConfig, {
  get(_target, prop: string) {
    return (getEnv() as any)[prop];
  },
});
