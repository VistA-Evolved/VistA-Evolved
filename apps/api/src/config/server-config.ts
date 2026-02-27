/**
 * Server-side compliance + hardening config — Phase 15F.
 *
 * Central configuration for sessions, logging, PHI redaction, audit sink,
 * rate limits, circuit breakers, and caching. Defaults are secure.
 * Override via environment variables.
 */

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

export const SESSION_CONFIG = {
  /** Absolute session TTL (ms). Default: 8 hours */
  absoluteTtlMs: Number(process.env.SESSION_ABSOLUTE_TTL_MS || 8 * 60 * 60 * 1000),
  /** Idle timeout (ms). Default: 30 minutes */
  idleTtlMs: Number(process.env.SESSION_IDLE_TTL_MS || 30 * 60 * 1000),
  /** Cleanup interval for expired sessions (ms) */
  cleanupIntervalMs: Number(process.env.SESSION_CLEANUP_MS || 60 * 1000),
  /** Cookie name */
  cookieName: "ehr_session",
  /** Rotate token on login to prevent fixation */
  rotateOnLogin: true,
} as const;

/* ------------------------------------------------------------------ */
/* Logging                                                             */
/* ------------------------------------------------------------------ */

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export const LOG_CONFIG = {
  /** Minimum log level. Default: info */
  level: (process.env.LOG_LEVEL || "info") as LogLevel,
  /** Emit JSON structured logs. Default: true */
  json: process.env.LOG_FORMAT !== "text",
  /** Redact these header names from request logs */
  redactHeaders: ["authorization", "cookie", "set-cookie"],
  /** Redact these body field names from request logs */
  redactBodyFields: [
    "accessCode", "verifyCode", "password", "secret",
    "token", "sessionToken", "avPlain",
  ],
} as const;

/* ------------------------------------------------------------------ */
/* PHI redaction                                                       */
/* ------------------------------------------------------------------ */

export const PHI_CONFIG = {
  /** Phase 151: DFN must never appear in audit logs — use hashed refs instead */
  auditIncludesDfn: false,
  /** Never include these in any log output */
  neverLogFields: [
    "ssn", "socialSecurityNumber", "dob", "dateOfBirth",
    "noteText", "noteContent", "problemText",
    // Phase 151: patient identifiers
    "dfn", "patientDfn", "patient_dfn", "patientName", "patient_name", "mrn",
  ],
} as const;

/* ------------------------------------------------------------------ */
/* Audit                                                               */
/* ------------------------------------------------------------------ */

export type AuditSink = "memory" | "file" | "stdout";

export const AUDIT_CONFIG = {
  /** Where to write audit events. Default: memory (in-process array) */
  sink: (process.env.AUDIT_SINK || "memory") as AuditSink,
  /** Max in-memory audit entries before oldest are evicted */
  maxMemoryEntries: Number(process.env.AUDIT_MAX_ENTRIES || 5000),
  /** File path for file-based audit sink */
  filePath: process.env.AUDIT_FILE_PATH || "logs/audit.jsonl",
  /** Retention period for audit entries (days). 0 = forever in memory */
  retentionDays: Number(process.env.AUDIT_RETENTION_DAYS || 365),
} as const;

/* ------------------------------------------------------------------ */
/* RPC circuit breaker + reliability                                   */
/* ------------------------------------------------------------------ */

export const RPC_CONFIG = {
  /** Default timeout per RPC call (ms) */
  callTimeoutMs: Number(process.env.RPC_CALL_TIMEOUT_MS || 15_000),
  /** Connection-level timeout (ms) */
  connectTimeoutMs: Number(process.env.RPC_CONNECT_TIMEOUT_MS || 10_000),
  /** Circuit breaker: failures before open */
  circuitBreakerThreshold: Number(process.env.RPC_CB_THRESHOLD || 5),
  /** Circuit breaker: time in open state before half-open probe (ms) */
  circuitBreakerResetMs: Number(process.env.RPC_CB_RESET_MS || 30_000),
  /** Max retries for idempotent reads */
  maxRetries: Number(process.env.RPC_MAX_RETRIES || 2),
  /** Retry delay base (ms), exponential backoff: base * 2^attempt */
  retryDelayBaseMs: Number(process.env.RPC_RETRY_DELAY_MS || 1000),
} as const;

/* ------------------------------------------------------------------ */
/* Cache                                                               */
/* ------------------------------------------------------------------ */

export const CACHE_CONFIG = {
  /** Default TTL for read-RPC caches (ms). Default: 60s */
  defaultTtlMs: Number(process.env.CACHE_DEFAULT_TTL_MS || 60_000),
  /** Patient demographics cache TTL (ms). Default: 5 min */
  demographicsTtlMs: Number(process.env.CACHE_DEMOGRAPHICS_TTL_MS || 300_000),
  /** List data cache TTL (ms). Default: 30s */
  listTtlMs: Number(process.env.CACHE_LIST_TTL_MS || 30_000),
  /** Max entries per cache namespace */
  maxEntries: Number(process.env.CACHE_MAX_ENTRIES || 500),
} as const;

/* ------------------------------------------------------------------ */
/* Imaging (Phase 22)                                                  */
/* ------------------------------------------------------------------ */

export const IMAGING_CONFIG = {
  /** Orthanc server base URL (DICOMweb + REST) */
  orthancUrl: process.env.ORTHANC_URL || "http://localhost:8042",
  /** OHIF viewer base URL */
  ohifUrl: process.env.OHIF_URL || "http://localhost:3003",
  /** DICOMweb root path on Orthanc */
  dicomWebRoot: process.env.ORTHANC_DICOMWEB_ROOT || "/dicom-web",
  /** Proxy timeout for DICOMweb requests (ms) */
  proxyTimeoutMs: Number(process.env.IMAGING_PROXY_TIMEOUT_MS || 30_000),
  /** Cache TTL for QIDO-RS study list responses (ms). Default: 30s */
  qidoCacheTtlMs: Number(process.env.IMAGING_QIDO_CACHE_TTL_MS || 30_000),
  /** Enable demo upload endpoint (admin only). Default: false in prod */
  enableDemoUpload: process.env.IMAGING_ENABLE_DEMO_UPLOAD === "true" ||
    process.env.NODE_ENV !== "production",
  /** Max DICOM upload size in bytes. Default: 512 MB */
  maxUploadBytes: Number(process.env.IMAGING_MAX_UPLOAD_BYTES || 512 * 1024 * 1024),
  // Phase 23: Ingest workflow
  /** Shared secret for Orthanc ingest webhook (X-Service-Key header) */
  ingestWebhookSecret: process.env.IMAGING_INGEST_WEBHOOK_SECRET || "dev-imaging-ingest-key-change-in-production",
} as const;

/* ------------------------------------------------------------------ */
/* Rate limits                                                         */
/* ------------------------------------------------------------------ */

export const RATE_LIMIT_CONFIG = {
  /** Max requests per window per IP for general endpoints */
  generalMax: Number(process.env.RATE_LIMIT_GENERAL || 200),
  /** Window duration (ms) */
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  /** Max login attempts per window per IP */
  loginMax: Number(process.env.RATE_LIMIT_LOGIN || 10),
} as const;

/* ------------------------------------------------------------------ */
/* CSRF (Phase 49, migrated to synchronizer token Phase 132)           */
/* ------------------------------------------------------------------ */

export const CSRF_CONFIG = {
  /**
   * CSRF cookie name — DEPRECATED (Phase 132).
   * Kept for backward compatibility with portal double-submit pattern.
   * EHR routes now use session-bound synchronizer token.
   */
  cookieName: "ehr_csrf",
  /** CSRF header name sent by the client on mutation requests */
  headerName: "x-csrf-token",
  /** Token length in bytes (hex-encoded = 2x this) */
  tokenBytes: 32,
  /** Exempt methods (safe methods per HTTP spec) */
  safeMethods: ["GET", "HEAD", "OPTIONS"] as readonly string[],
} as const;

/* ------------------------------------------------------------------ */
/* Account lockout (Phase 49)                                          */
/* ------------------------------------------------------------------ */

export const LOCKOUT_CONFIG = {
  /** Max failed login attempts per account before lockout */
  maxAttempts: Number(process.env.LOGIN_LOCKOUT_MAX || 5),
  /** Lockout duration (ms). Default: 15 minutes */
  lockoutDurationMs: Number(process.env.LOGIN_LOCKOUT_DURATION_MS || 15 * 60 * 1000),
  /** Window for counting failures (ms). Default: 15 minutes */
  windowMs: Number(process.env.LOGIN_LOCKOUT_WINDOW_MS || 15 * 60 * 1000),
} as const;
