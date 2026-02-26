/**
 * Store Policy — Phase 136: Store Policy Gate + Durability Sweep
 *
 * Machine-readable registry of ALL in-memory stores in the API.
 * Covers Map stores, array buffers, and ring buffers.
 * Each store is classified by risk level and durability status.
 *
 * Classifications:
 *   critical   — Domain data that MUST survive restart in rc/prod (claims, sessions, etc.)
 *   cache      — TTL/size-limited read cache; loss = performance hit only
 *   rate_limiter — Security rate-limit buckets; loss = briefly unprotected
 *   registry   — Loaded from config/files at startup; auto-repopulated
 *   audit      — Append-only audit chains (typically also have JSONL file sink)
 *   dev_only   — QA/debug stores gated by env vars
 *
 * Durability status:
 *   pg_backed       — Has a PG repo via store-resolver; Map is write-through cache
 *   sqlite_backed   — Has a SQLite repo; Map is write-through cache
 *   jsonl_backed    — Append-only with JSONL file sink (audit trails)
 *   file_seeded     — Loaded from JSON seed files at startup
 *   vista_passthrough — Data comes from VistA RPC calls; not locally persisted
 *   in_memory_only  — No durable backing; lost on restart
 *   env_gated       — Only active when specific env var is set
 *
 * In rc/prod mode, any `critical` + `in_memory_only` store is a policy violation.
 */

export type StoreClassification =
  | "critical"
  | "cache"
  | "rate_limiter"
  | "registry"
  | "audit"
  | "dev_only";

export type DurabilityStatus =
  | "pg_backed"
  | "sqlite_backed"
  | "jsonl_backed"
  | "file_seeded"
  | "vista_passthrough"
  | "in_memory_only"
  | "env_gated";

export interface StoreEntry {
  /** Unique identifier for the store */
  id: string;
  /** Source file (relative to apps/api/src/) */
  file: string;
  /** Variable/field name */
  variable: string;
  /** What the store holds */
  description: string;
  /** Risk classification */
  classification: StoreClassification;
  /** Durability backing */
  durability: DurabilityStatus;
  /** Owner domain/subsystem */
  domain: string;
  /** For cache stores: TTL in ms (0 = no TTL) */
  ttlMs?: number;
  /** For cache stores: max entries (0 = unbounded) */
  maxSize?: number;
  /** Migration target (if in_memory_only and critical) */
  migrationTarget?: string;
  /** Additional notes */
  notes?: string;
}

/**
 * Complete inventory of all in-memory stores.
 *
 * IMPORTANT: When adding a new in-memory store to the API, you MUST add an entry here.
 * The store-policy QA gate will fail if it detects unregistered `new Map` patterns
 * in source files that are not in this inventory.
 */
export const STORE_INVENTORY: StoreEntry[] = [
  // ═══════════════════════════════════════════════════════════
  // AUTH / SESSIONS
  // ═══════════════════════════════════════════════════════════
  {
    id: "session-cache",
    file: "auth/session-store.ts",
    variable: "sessionCache",
    description: "Session token to CachedSession mapping",
    classification: "cache",
    durability: "pg_backed",
    domain: "auth",
    ttlMs: 300_000,
    maxSize: 10_000,
    notes: "Sessions are persisted in PG via pgSessionRepo; Map is read-through cache",
  },
  {
    id: "portal-sessions",
    file: "routes/portal-auth.ts",
    variable: "portalSessions",
    description: "Portal session data",
    classification: "critical",
    durability: "in_memory_only",
    domain: "portal",
    migrationTarget: "pg: portal_sessions table",
    notes: "Phase 136: classified as critical. Portal auth sessions lost on restart.",
  },
  {
    id: "iam-sessions",
    file: "portal-iam/portal-iam-routes.ts",
    variable: "iamSessions",
    description: "IAM portal session data",
    classification: "critical",
    durability: "in_memory_only",
    domain: "portal",
    migrationTarget: "pg: portal_sessions table",
    notes: "Phase 136: classified as critical. IAM sessions lost on restart.",
  },
  {
    id: "portal-users",
    file: "portal-iam/portal-user-store.ts",
    variable: "users",
    description: "Portal user accounts + username/email indexes",
    classification: "critical",
    durability: "in_memory_only",
    domain: "portal",
    migrationTarget: "pg: portal_users table",
    notes: "Includes usersByUsername and usersByEmail index Maps",
  },
  {
    id: "lockout-store",
    file: "auth/auth-routes.ts",
    variable: "lockoutStore",
    description: "Account lockout tracking",
    classification: "rate_limiter",
    durability: "in_memory_only",
    domain: "auth",
    notes: "Security lockout; loss = accounts temporarily unlocked on restart. Acceptable.",
  },
  {
    id: "pending-auth-states",
    file: "auth/idp/idp-routes.ts",
    variable: "pendingAuthStates",
    description: "OAuth state parameters (short-lived)",
    classification: "cache",
    durability: "in_memory_only",
    domain: "auth",
    ttlMs: 300_000,
    maxSize: 1_000,
    notes: "OAuth flow states; users retry login on restart. Acceptable.",
  },
  {
    id: "pending-challenges",
    file: "auth/biometric/passkeys-provider.ts",
    variable: "pendingChallenges",
    description: "WebAuthn challenge nonces (5-min TTL)",
    classification: "cache",
    durability: "in_memory_only",
    domain: "auth",
    ttlMs: 300_000,
    maxSize: 1_000,
    notes: "Ephemeral challenges; users retry on restart. Acceptable.",
  },
  {
    id: "vista-bindings",
    file: "auth/idp/vista-binding.ts",
    variable: "vistaBindings",
    description: "IDP to VistA user DUZ bindings",
    classification: "critical",
    durability: "in_memory_only",
    domain: "auth",
    migrationTarget: "pg: idp_vista_bindings table",
    notes: "Phase 136: classified as critical. User mappings lost on restart.",
  },

  // ═══════════════════════════════════════════════════════════
  // RCM — CLAIMS & BILLING
  // ═══════════════════════════════════════════════════════════
  {
    id: "rcm-claims",
    file: "rcm/domain/claim-store.ts",
    variable: "claims",
    description: "RCM Claims + remittances + tenant index",
    classification: "critical",
    durability: "pg_backed",
    domain: "rcm",
    notes: "Phase 126: PG repo (rcm_claim, rcm_remittance). Map is write-through cache.",
  },
  {
    id: "rcm-claim-cases",
    file: "rcm/claims/claim-store.ts",
    variable: "cases",
    description: "ClaimCase records + indexes (tenant, denial)",
    classification: "critical",
    durability: "pg_backed",
    domain: "rcm",
    notes: "Phase 126: PG repo (rcm_claim_case). Map is write-through cache.",
  },
  {
    id: "rcm-denial-store",
    file: "rcm/workflows/claims-workflow.ts",
    variable: "denialStore",
    description: "claimId to DenialRecord[] mapping",
    classification: "critical",
    durability: "in_memory_only",
    domain: "rcm",
    migrationTarget: "pg: rcm_claim_case denials column",
    notes: "Phase 136: duplicate denial tracking. Cases have denials in PG already.",
  },
  {
    id: "rcm-edi-pipeline",
    file: "rcm/edi/pipeline.ts",
    variable: "pipelineEntries",
    description: "EDI pipeline stage tracking + claim index",
    classification: "critical",
    durability: "pg_backed",
    domain: "rcm",
    notes: "Phase 126: PG repo (edi_pipeline_entry). Write-through cache.",
  },
  {
    id: "rcm-edi-acks",
    file: "rcm/edi/ack-status-processor.ts",
    variable: "acks",
    description: "EDI acknowledgements + indexes (claim, idempotency, status)",
    classification: "critical",
    durability: "pg_backed",
    domain: "rcm",
    notes: "Phase 126: PG repo (edi_acknowledgement, edi_claim_status). Write-through cache.",
  },
  {
    id: "rcm-remit-processor",
    file: "rcm/edi/remit-processor.ts",
    variable: "processedRemittances",
    description: "Processed remittance records + idempotency index",
    classification: "critical",
    durability: "in_memory_only",
    domain: "rcm",
    migrationTarget: "pg: rcm_remittance table",
    notes: "Phase 136: should use rcm_remittance PG table via store-resolver.",
  },
  {
    id: "rcm-payments",
    file: "rcm/payments/payment-store.ts",
    variable: "batches",
    description: "Remittance batches, lines, postings, underpayments + indexes",
    classification: "critical",
    durability: "in_memory_only",
    domain: "rcm",
    migrationTarget: "pg: rcm_payment_* tables",
    notes: "Phase 136: 11 Maps in payment-store.ts. All critical financial data.",
  },
  {
    id: "rcm-loa-store",
    file: "rcm/loa/loa-store.ts",
    variable: "loaStore",
    description: "LOA requests + tenant index",
    classification: "critical",
    durability: "in_memory_only",
    domain: "rcm",
    migrationTarget: "pg: rcm_loa_request table",
    notes: "Phase 136: Letter of Authorization requests lost on restart.",
  },
  {
    id: "rcm-remit-intake",
    file: "rcm/workflows/remittance-intake.ts",
    variable: "remitDocStore",
    description: "Remittance documents + tenant index",
    classification: "critical",
    durability: "in_memory_only",
    domain: "rcm",
    migrationTarget: "pg: rcm_remittance_document table",
    notes: "Phase 136: document intake records lost on restart.",
  },
  {
    id: "rcm-transactions",
    file: "rcm/transactions/envelope.ts",
    variable: "transactionStore",
    description: "EDI transactions + correlation/source indexes + control counters",
    classification: "critical",
    durability: "in_memory_only",
    domain: "rcm",
    migrationTarget: "pg: rcm_transaction table",
    notes: "Phase 136: control number counters reset on restart (dangerous for EDI).",
  },
  {
    id: "rcm-ph-submissions",
    file: "rcm/philhealth-eclaims3/submission-tracker.ts",
    variable: "submissions",
    description: "PhilHealth submission tracking + draft/packet indexes",
    classification: "critical",
    durability: "in_memory_only",
    domain: "rcm",
    migrationTarget: "pg: rcm_ph_submissions table",
    notes: "Phase 136: PhilHealth submission records lost on restart.",
  },
  {
    id: "rcm-hmo-submissions",
    file: "rcm/hmo-portal/submission-tracker.ts",
    variable: "submissions",
    description: "HMO submission tracking",
    classification: "critical",
    durability: "in_memory_only",
    domain: "rcm",
    migrationTarget: "pg: rcm_hmo_submissions table",
    notes: "Phase 136: HMO submission records lost on restart.",
  },
  {
    id: "rcm-payer-enrollments",
    file: "rcm/payerOps/store.ts",
    variable: "enrollments",
    description: "FacilityPayerEnrollment records",
    classification: "critical",
    durability: "in_memory_only",
    domain: "rcm",
    migrationTarget: "pg: rcm_payer_enrollment table",
    notes: "Phase 136: enrollment records lost on restart.",
  },
  {
    id: "rcm-loa-cases",
    file: "rcm/payerOps/store.ts",
    variable: "loaCases",
    description: "LOACase records",
    classification: "critical",
    durability: "in_memory_only",
    domain: "rcm",
    migrationTarget: "pg: rcm_loa_case table",
    notes: "Phase 136: LOA case records lost on restart.",
  },
  {
    id: "rcm-credentials",
    file: "rcm/payerOps/store.ts",
    variable: "credentials",
    description: "CredentialVaultEntry records (SENSITIVE)",
    classification: "critical",
    durability: "in_memory_only",
    domain: "rcm",
    migrationTarget: "pg: rcm_credential_vault (encrypted)",
    notes: "Phase 136: SENSITIVE credential data lost on restart. Must encrypt at rest.",
  },
  {
    id: "rcm-ph-drafts",
    file: "rcm/payerOps/philhealth-store.ts",
    variable: "claimDrafts",
    description: "PhilHealth claim drafts",
    classification: "critical",
    durability: "in_memory_only",
    domain: "rcm",
    migrationTarget: "pg: rcm_ph_claim_draft table",
    notes: "Phase 136: PhilHealth claim drafts lost on restart.",
  },
  {
    id: "rcm-ph-facility-setups",
    file: "rcm/payerOps/philhealth-store.ts",
    variable: "facilitySetups",
    description: "PhilHealth facility configurations",
    classification: "critical",
    durability: "in_memory_only",
    domain: "rcm",
    migrationTarget: "pg: rcm_ph_facility_setup table",
    notes: "Phase 136: facility configuration lost on restart.",
  },
  {
    id: "rcm-payer-registry-sources",
    file: "rcm/payerOps/registry-store.ts",
    variable: "sources",
    description: "PayerRegistrySource + payers + relationships",
    classification: "critical",
    durability: "in_memory_only",
    domain: "rcm",
    migrationTarget: "pg: existing payer PG tables",
    notes: "Phase 136: payer registry data lost on restart.",
  },
  {
    id: "rcm-payer-directory",
    file: "rcm/payerDirectory/normalization.ts",
    variable: "directoryStore",
    description: "DirectoryPayer + enrollment packets",
    classification: "critical",
    durability: "in_memory_only",
    domain: "rcm",
    migrationTarget: "pg: payer directory PG tables",
    notes: "Phase 136: payer directory records lost on restart.",
  },
  {
    id: "rcm-matching-engine",
    file: "rcm/reconciliation/matching-engine.ts",
    variable: "knownClaims",
    description: "Known claims for 835 matching",
    classification: "cache",
    durability: "in_memory_only",
    domain: "rcm",
    ttlMs: 300_000,
    maxSize: 10_000,
    notes: "Loaded from claim store on demand. Cache of existing PG-backed claims.",
  },
  {
    id: "rcm-payer-rules",
    file: "rcm/rules/payer-rules.ts",
    variable: "rules",
    description: "PayerRule definitions + payer index",
    classification: "critical",
    durability: "in_memory_only",
    domain: "rcm",
    migrationTarget: "pg: rcm_payer_rule table",
    notes: "Phase 136: payer rules lost on restart.",
  },
  {
    id: "rcm-payer-rulepacks",
    file: "rcm/payers/payer-rulepacks.ts",
    variable: "rulepackStore",
    description: "PayerRulepack records",
    classification: "critical",
    durability: "in_memory_only",
    domain: "rcm",
    migrationTarget: "pg: rcm_payer_rulepack table",
    notes: "Phase 136: rulepack records lost on restart.",
  },

  // ═══════════════════════════════════════════════════════════
  // PORTAL
  // ═══════════════════════════════════════════════════════════
  {
    id: "portal-refills",
    file: "services/portal-refills.ts",
    variable: "refillStore",
    description: "Portal refill requests",
    classification: "critical",
    durability: "in_memory_only",
    domain: "portal",
    migrationTarget: "pg: portal_refills table",
    notes: "Phase 136: patient refill requests lost on restart.",
  },
  {
    id: "portal-tasks",
    file: "services/portal-tasks.ts",
    variable: "taskStore",
    description: "Portal tasks",
    classification: "critical",
    durability: "in_memory_only",
    domain: "portal",
    migrationTarget: "pg: portal_tasks table",
    notes: "Phase 136: patient tasks lost on restart.",
  },
  {
    id: "portal-settings",
    file: "services/portal-settings.ts",
    variable: "settingsStore",
    description: "Portal user settings",
    classification: "critical",
    durability: "in_memory_only",
    domain: "portal",
    migrationTarget: "pg: portal_settings table",
    notes: "Phase 136: user settings lost on restart.",
  },
  {
    id: "portal-sensitivity",
    file: "services/portal-sensitivity.ts",
    variable: "proxyStore",
    description: "ProxyRelationship + SensitivityPolicy records",
    classification: "critical",
    durability: "in_memory_only",
    domain: "portal",
    migrationTarget: "pg: portal_sensitivity table",
    notes: "Phase 136: proxy/sensitivity data lost on restart.",
  },
  {
    id: "portal-sharing",
    file: "services/portal-sharing.ts",
    variable: "shareStore",
    description: "ShareLink records + token index",
    classification: "critical",
    durability: "in_memory_only",
    domain: "portal",
    migrationTarget: "pg: portal_share_links table",
    notes: "Phase 136: share links broken after restart.",
  },
  {
    id: "portal-record-portability",
    file: "services/record-portability-store.ts",
    variable: "exportStore",
    description: "Export artifacts + share links + token index",
    classification: "critical",
    durability: "in_memory_only",
    domain: "portal",
    migrationTarget: "pg: portal_exports table",
    notes: "Phase 136: export artifacts and share tokens lost on restart.",
  },
  {
    id: "portal-proxy-invitations",
    file: "portal-iam/proxy-store.ts",
    variable: "invitations",
    description: "Proxy invitations",
    classification: "critical",
    durability: "in_memory_only",
    domain: "portal",
    migrationTarget: "pg: portal_proxy_invitations table",
    notes: "Phase 136: pending proxy invitations lost on restart.",
  },
  {
    id: "portal-access-logs",
    file: "portal-iam/access-log-store.ts",
    variable: "accessLogs",
    description: "Portal user access log entries",
    classification: "audit",
    durability: "in_memory_only",
    domain: "portal",
    migrationTarget: "pg: portal_access_log table",
    notes: "Audit data; should be durable but acceptable as dev-only for now.",
  },
  {
    id: "portal-messaging",
    file: "services/portal-messaging.ts",
    variable: "messageCache",
    description: "Portal messages",
    classification: "critical",
    durability: "in_memory_only",
    domain: "portal",
    migrationTarget: "pg: portal_messages table or VistA MailMan",
    notes: "Phase 136: patient messages lost on restart.",
  },
  {
    id: "portal-appointments",
    file: "services/portal-appointments.ts",
    variable: "appointmentCache",
    description: "Appointment cache from VistA",
    classification: "cache",
    durability: "vista_passthrough",
    domain: "portal",
    ttlMs: 60_000,
    maxSize: 500,
    notes: "Read-through cache from VistA scheduling RPCs. Loss = refetch from VistA.",
  },

  // ═══════════════════════════════════════════════════════════
  // IMAGING
  // ═══════════════════════════════════════════════════════════
  {
    id: "imaging-worklist",
    file: "services/imaging-worklist.ts",
    variable: "worklistCache",
    description: "Imaging worklist items",
    classification: "critical",
    durability: "in_memory_only",
    domain: "imaging",
    migrationTarget: "pg: imaging_worklist table or VistA Rad/Nuc Med",
    notes: "Phase 23 explicitly documents this as in-memory with migration plan.",
  },
  {
    id: "imaging-ingest",
    file: "services/imaging-ingest.ts",
    variable: "linkageCache",
    description: "Study linkage + unmatched (quarantined) studies",
    classification: "critical",
    durability: "in_memory_only",
    domain: "imaging",
    migrationTarget: "pg: imaging_ingest table",
    notes: "Quarantined studies lost on restart.",
  },
  {
    id: "imaging-devices",
    file: "services/imaging-devices.ts",
    variable: "deviceStore",
    description: "DICOM device registry + AE title index",
    classification: "critical",
    durability: "in_memory_only",
    domain: "imaging",
    migrationTarget: "pg: imaging_devices table",
    notes: "Device registry lost on restart.",
  },
  {
    id: "imaging-break-glass",
    file: "services/imaging-authz.ts",
    variable: "breakGlassStore",
    description: "Break-glass sessions + expiry timers",
    classification: "cache",
    durability: "in_memory_only",
    domain: "imaging",
    ttlMs: 14_400_000,
    maxSize: 1_000,
    notes: "Time-limited break-glass sessions. Loss = users re-request. Acceptable as cache.",
  },

  // ═══════════════════════════════════════════════════════════
  // TELEHEALTH
  // ═══════════════════════════════════════════════════════════
  {
    id: "telehealth-rooms",
    file: "telehealth/room-store.ts",
    variable: "rooms",
    description: "Telehealth room lifecycle",
    classification: "critical",
    durability: "in_memory_only",
    domain: "telehealth",
    migrationTarget: "pg: telehealth_rooms table",
    notes: "Phase 30: explicitly in-memory with 4h TTL. Active sessions lost on restart.",
  },

  // ═══════════════════════════════════════════════════════════
  // SCHEDULING
  // ═══════════════════════════════════════════════════════════
  {
    id: "scheduling-requests",
    file: "adapters/scheduling/vista-adapter.ts",
    variable: "requestStore",
    description: "WaitListEntry scheduling requests",
    classification: "critical",
    durability: "in_memory_only",
    domain: "scheduling",
    migrationTarget: "pg: scheduling_requests table or VistA SD files",
    notes: "Phase 136: scheduling wait list entries lost on restart.",
  },
  {
    id: "scheduling-booking-locks",
    file: "adapters/scheduling/vista-adapter.ts",
    variable: "bookingLocks",
    description: "Booking lock timestamps",
    classification: "cache",
    durability: "in_memory_only",
    domain: "scheduling",
    ttlMs: 300_000,
    maxSize: 500,
    notes: "Short-lived locks; stale locks auto-expire. Loss = double-booking risk for 5min.",
  },

  // ═══════════════════════════════════════════════════════════
  // CLINICAL / ORDERS / NOTES
  // ═══════════════════════════════════════════════════════════
  {
    id: "write-back-drafts",
    file: "routes/write-backs.ts",
    variable: "drafts",
    description: "ServerDraft write-back drafts",
    classification: "critical",
    durability: "in_memory_only",
    domain: "clinical",
    migrationTarget: "pg: clinical_drafts table",
    notes: "Phase 136: unsaved clinical drafts lost on restart.",
  },
  {
    id: "orders-idempotency",
    file: "routes/cprs/orders-cpoe.ts",
    variable: "idempotencyStore",
    description: "Order idempotency entries",
    classification: "cache",
    durability: "in_memory_only",
    domain: "clinical",
    ttlMs: 600_000,
    maxSize: 10_000,
    notes: "Prevents duplicate order submissions. Loss = brief window of duplicate risk.",
  },
  {
    id: "tiu-idempotency",
    file: "routes/cprs/tiu-notes.ts",
    variable: "idempotencyStore",
    description: "TIU note idempotency entries",
    classification: "cache",
    durability: "in_memory_only",
    domain: "clinical",
    ttlMs: 600_000,
    maxSize: 10_000,
    notes: "Prevents duplicate note submissions.",
  },
  {
    id: "wave2-idempotency",
    file: "routes/cprs/wave2-routes.ts",
    variable: "idempotencyStore",
    description: "Wave2 routes idempotency",
    classification: "cache",
    durability: "in_memory_only",
    domain: "clinical",
    ttlMs: 600_000,
    maxSize: 10_000,
    notes: "Prevents duplicate submissions for wave2 routes.",
  },
  {
    id: "middleware-idempotency",
    file: "middleware/idempotency.ts",
    variable: "memoryStore",
    description: "Idempotency CachedResponse store",
    classification: "cache",
    durability: "in_memory_only",
    domain: "infrastructure",
    ttlMs: 3_600_000,
    maxSize: 5_000,
    notes: "Phase 103: payer-db route idempotency. Loss = retryable.",
  },
  {
    id: "secure-messaging-fallback",
    file: "services/secure-messaging.ts",
    variable: "fallbackCache",
    description: "Secure message fallback store",
    classification: "cache",
    durability: "vista_passthrough",
    domain: "clinical",
    ttlMs: 300_000,
    maxSize: 1_000,
    notes: "Fallback when VistA MailMan unavailable. Loss = refetch from VistA.",
  },

  // ═══════════════════════════════════════════════════════════
  // INTAKE
  // ═══════════════════════════════════════════════════════════
  {
    id: "intake-sessions",
    file: "intake/intake-store.ts",
    variable: "sessions",
    description: "Intake sessions + QR snapshots + kiosk tokens",
    classification: "critical",
    durability: "in_memory_only",
    domain: "intake",
    migrationTarget: "pg: intake_sessions table",
    notes: "Phase 136: active intake forms lost on restart.",
  },

  // ═══════════════════════════════════════════════════════════
  // MIGRATION
  // ═══════════════════════════════════════════════════════════
  {
    id: "migration-jobs",
    file: "migration/migration-store.ts",
    variable: "jobStore",
    description: "Migration jobs + templates + rollback plans",
    classification: "critical",
    durability: "in_memory_only",
    domain: "migration",
    migrationTarget: "pg: migration_jobs table",
    notes: "Phase 136: migration state lost on restart.",
  },

  // ═══════════════════════════════════════════════════════════
  // UI PREFS
  // ═══════════════════════════════════════════════════════════
  {
    id: "ui-prefs",
    file: "services/ui-prefs-store.ts",
    variable: "store",
    description: "UIPrefsDocument per user",
    classification: "critical",
    durability: "in_memory_only",
    domain: "clinical",
    migrationTarget: "pg: ui_prefs table",
    notes: "Phase 136: user UI preferences lost on restart.",
  },

  // ═══════════════════════════════════════════════════════════
  // HANDOFF
  // ═══════════════════════════════════════════════════════════
  {
    id: "handoff-reports",
    file: "routes/handoff/handoff-store.ts",
    variable: "handoffStore",
    description: "Handoff report records",
    classification: "critical",
    durability: "in_memory_only",
    domain: "clinical",
    migrationTarget: "pg: handoff_reports table",
    notes: "Phase 136: clinical handoff reports lost on restart.",
  },

  // ═══════════════════════════════════════════════════════════
  // EXPORT GOVERNANCE
  // ═══════════════════════════════════════════════════════════
  {
    id: "export-jobs",
    file: "lib/export-governance.ts",
    variable: "exportJobs",
    description: "Data export job tracking",
    classification: "critical",
    durability: "in_memory_only",
    domain: "infrastructure",
    migrationTarget: "pg: export_jobs table",
    notes: "Phase 136: export job state lost on restart.",
  },

  // ═══════════════════════════════════════════════════════════
  // CACHES (TTL/size-limited, loss = perf hit only)
  // ═══════════════════════════════════════════════════════════
  {
    id: "rpc-cache",
    file: "lib/rpc-resilience.ts",
    variable: "rpcCache",
    description: "RPC response cache",
    classification: "cache",
    durability: "in_memory_only",
    domain: "infrastructure",
    ttlMs: 30_000,
    maxSize: 500,
    notes: "Short-lived RPC response cache. Loss = refetch from VistA.",
  },
  {
    id: "rpc-metrics",
    file: "lib/rpc-resilience.ts",
    variable: "metricsMap",
    description: "RPC call metrics accumulator",
    classification: "registry",
    durability: "in_memory_only",
    domain: "infrastructure",
    notes: "Metrics accumulator (grows with unique RPC names, bounded by RPC catalog ~120). Reset on restart acceptable.",
  },
  {
    id: "clinical-report-cache",
    file: "services/clinical-reports.ts",
    variable: "reportListCache",
    description: "Clinical report list + text cache",
    classification: "cache",
    durability: "vista_passthrough",
    domain: "clinical",
    ttlMs: 30_000,
    maxSize: 200,
    notes: "30s TTL read cache from VistA ORWRP. Loss = refetch.",
  },
  {
    id: "report-cache",
    file: "routes/reporting.ts",
    variable: "reportCache",
    description: "Report endpoint cache",
    classification: "cache",
    durability: "in_memory_only",
    domain: "infrastructure",
    ttlMs: 60_000,
    maxSize: 100,
    notes: "Short-lived report cache.",
  },
  {
    id: "analytics-dashboard-cache",
    file: "routes/analytics-routes.ts",
    variable: "dashboardCache",
    description: "Analytics dashboard cache",
    classification: "cache",
    durability: "in_memory_only",
    domain: "analytics",
    ttlMs: 60_000,
    maxSize: 50,
    notes: "Short-lived dashboard cache.",
  },
  {
    id: "qido-cache",
    file: "routes/imaging-proxy.ts",
    variable: "qidoCache",
    description: "QIDO-RS query cache",
    classification: "cache",
    durability: "in_memory_only",
    domain: "imaging",
    ttlMs: 30_000,
    maxSize: 200,
    notes: "DICOMweb QIDO response cache. Loss = refetch from Orthanc.",
  },
  {
    id: "payer-cache",
    file: "rcm/payers/payer-persistence.ts",
    variable: "payerCache",
    description: "Payer data + tenant override cache (DB-backed)",
    classification: "cache",
    durability: "pg_backed",
    domain: "rcm",
    ttlMs: 300_000,
    maxSize: 1_000,
    notes: "Read-through cache for PG payer data.",
  },
  {
    id: "connector-probe-cache",
    file: "rcm/connectors/connector-state.ts",
    variable: "probeCache",
    description: "Connector health probe cache",
    classification: "cache",
    durability: "in_memory_only",
    domain: "rcm",
    ttlMs: 60_000,
    maxSize: 50,
    notes: "Connector health check cache.",
  },
  {
    id: "ph-packet-cache",
    file: "rcm/philhealth-eclaims3/eclaims3-routes.ts",
    variable: "packetCache",
    description: "PhilHealth claim packet + export cache",
    classification: "cache",
    durability: "in_memory_only",
    domain: "rcm",
    ttlMs: 300_000,
    maxSize: 200,
    notes: "Short-lived claim packet cache for eClaims3 routes.",
  },
  {
    id: "hmo-packet-cache",
    file: "rcm/hmo-portal/hmo-portal-routes.ts",
    variable: "loaPacketCache",
    description: "HMO LOA + claim packet cache",
    classification: "cache",
    durability: "in_memory_only",
    domain: "rcm",
    ttlMs: 300_000,
    maxSize: 200,
    notes: "Short-lived HMO claim packet cache.",
  },
  {
    id: "payment-upload-cache",
    file: "rcm/payments/payment-routes.ts",
    variable: "uploadCache",
    description: "File upload temp cache",
    classification: "cache",
    durability: "in_memory_only",
    domain: "rcm",
    ttlMs: 300_000,
    maxSize: 50,
    notes: "Temporary file upload buffer.",
  },
  {
    id: "jwks-cache",
    file: "auth/jwt-validator.ts",
    variable: "jwksCache",
    description: "JWKS public key cache",
    classification: "cache",
    durability: "in_memory_only",
    domain: "auth",
    ttlMs: 600_000,
    maxSize: 10,
    notes: "JWKS key cache with 10-min refresh on kid miss.",
  },
  {
    id: "slo-windows",
    file: "telemetry/metrics.ts",
    variable: "sloWindows",
    description: "SLO metric sliding windows",
    classification: "cache",
    durability: "in_memory_only",
    domain: "infrastructure",
    ttlMs: 0,
    maxSize: 1_000,
    notes: "SLO sliding window metrics. Size-limited.",
  },

  // ═══════════════════════════════════════════════════════════
  // RATE LIMITERS (loss = briefly unprotected, acceptable)
  // ═══════════════════════════════════════════════════════════
  {
    id: "global-rate-buckets",
    file: "middleware/security.ts",
    variable: "rateBuckets",
    description: "Global API rate limit buckets",
    classification: "rate_limiter",
    durability: "in_memory_only",
    domain: "infrastructure",
  },
  {
    id: "dicomweb-rate-buckets",
    file: "routes/imaging-proxy.ts",
    variable: "dicomwebRateBuckets",
    description: "DICOMweb rate limiter",
    classification: "rate_limiter",
    durability: "in_memory_only",
    domain: "imaging",
  },
  {
    id: "portal-login-attempts",
    file: "routes/portal-auth.ts",
    variable: "loginAttempts",
    description: "Portal login rate limiter",
    classification: "rate_limiter",
    durability: "in_memory_only",
    domain: "portal",
  },
  {
    id: "iam-auth-attempts",
    file: "portal-iam/portal-iam-routes.ts",
    variable: "authAttempts",
    description: "IAM auth rate limiter",
    classification: "rate_limiter",
    durability: "in_memory_only",
    domain: "portal",
  },
  {
    id: "messaging-rate-buckets",
    file: "services/secure-messaging.ts",
    variable: "rateBuckets",
    description: "Messaging rate limiter",
    classification: "rate_limiter",
    durability: "in_memory_only",
    domain: "clinical",
  },
  {
    id: "refill-rate-timestamps",
    file: "services/portal-refills.ts",
    variable: "refillTimestamps",
    description: "Refill rate limiter",
    classification: "rate_limiter",
    durability: "in_memory_only",
    domain: "portal",
  },
  {
    id: "portal-send-timestamps",
    file: "services/portal-messaging.ts",
    variable: "sendTimestamps",
    description: "Messaging send rate limiter",
    classification: "rate_limiter",
    durability: "in_memory_only",
    domain: "portal",
  },
  {
    id: "ai-rate-timestamps",
    file: "ai/ai-gateway.ts",
    variable: "userRequestTimestamps",
    description: "AI request rate limiter",
    classification: "rate_limiter",
    durability: "in_memory_only",
    domain: "ai",
  },
  {
    id: "rcm-polling-buckets",
    file: "rcm/jobs/polling-scheduler.ts",
    variable: "buckets",
    description: "Job polling rate buckets",
    classification: "rate_limiter",
    durability: "in_memory_only",
    domain: "rcm",
  },
  {
    id: "connector-circuit-breakers",
    file: "rcm/connectors/connector-resilience.ts",
    variable: "breakers",
    description: "Per-connector circuit breakers",
    classification: "rate_limiter",
    durability: "in_memory_only",
    domain: "rcm",
  },

  // ═══════════════════════════════════════════════════════════
  // REGISTRIES (loaded from config files, not user data)
  // ═══════════════════════════════════════════════════════════
  {
    id: "tenant-config",
    file: "config/tenant-config.ts",
    variable: "tenants",
    description: "TenantConfig registry",
    classification: "registry",
    durability: "pg_backed",
    domain: "infrastructure",
    notes: "Phase 96/102: PG-backed tenant config. Map is cache.",
  },
  {
    id: "marketplace-tenant-config",
    file: "config/marketplace-tenant.ts",
    variable: "tenantConfigs",
    description: "Marketplace tenant configs",
    classification: "registry",
    durability: "file_seeded",
    domain: "infrastructure",
  },
  {
    id: "imaging-tenant-config",
    file: "config/imaging-tenant.ts",
    variable: "tenantConfigs",
    description: "Imaging tenant configs",
    classification: "registry",
    durability: "file_seeded",
    domain: "imaging",
  },
  {
    id: "integration-registry",
    file: "config/integration-registry.ts",
    variable: "registryStore",
    description: "Integration entries per tenant",
    classification: "registry",
    durability: "file_seeded",
    domain: "infrastructure",
  },
  {
    id: "module-compiled-patterns",
    file: "modules/module-registry.ts",
    variable: "compiledPatterns",
    description: "Route-to-module regex patterns",
    classification: "registry",
    durability: "file_seeded",
    domain: "infrastructure",
    notes: "Compiled from config/modules.json at startup.",
  },
  {
    id: "module-overrides",
    file: "modules/module-registry.ts",
    variable: "tenantModuleOverrides",
    description: "Tenant module overrides",
    classification: "registry",
    durability: "pg_backed",
    domain: "infrastructure",
    notes: "Phase 109: DB-backed module entitlements.",
  },
  {
    id: "adapter-instances",
    file: "adapters/adapter-loader.ts",
    variable: "adapters",
    description: "Loaded adapter instances",
    classification: "registry",
    durability: "env_gated",
    domain: "infrastructure",
    notes: "Constructed from ADAPTER_* env vars at startup.",
  },
  {
    id: "payer-registry-seed",
    file: "rcm/payer-registry/registry.ts",
    variable: "payers",
    description: "Seeded payer records from JSON files",
    classification: "registry",
    durability: "file_seeded",
    domain: "rcm",
    notes: "Loaded from data/payers/*.json at startup.",
  },
  {
    id: "ph-hmo-registry",
    file: "rcm/payers/ph-hmo-registry.ts",
    variable: "hmoStore",
    description: "PhilHealth HMO registry",
    classification: "registry",
    durability: "file_seeded",
    domain: "rcm",
  },
  {
    id: "connector-instances",
    file: "rcm/connectors/types.ts",
    variable: "connectors",
    description: "RCM connector instances",
    classification: "registry",
    durability: "env_gated",
    domain: "rcm",
  },
  {
    id: "payer-adapter-instances",
    file: "rcm/adapters/payer-adapter.ts",
    variable: "adapters",
    description: "Payer adapter instances",
    classification: "registry",
    durability: "env_gated",
    domain: "rcm",
  },
  {
    id: "edi-translators",
    file: "rcm/transactions/translator.ts",
    variable: "translators",
    description: "EDI translator instances",
    classification: "registry",
    durability: "env_gated",
    domain: "rcm",
  },
  {
    id: "edi835-parsers",
    file: "rcm/reconciliation/edi835-parser.ts",
    variable: "parsers",
    description: "835 parser instances",
    classification: "registry",
    durability: "env_gated",
    domain: "rcm",
  },
  {
    id: "loa-adapters",
    file: "rcm/loa/loa-adapter.ts",
    variable: "adapterRegistry",
    description: "LOA adapter registry",
    classification: "registry",
    durability: "env_gated",
    domain: "rcm",
  },
  {
    id: "hmo-portal-adapters",
    file: "rcm/hmo-portal/types.ts",
    variable: "adapterRegistry",
    description: "Portal adapter registry",
    classification: "registry",
    durability: "env_gated",
    domain: "rcm",
  },
  {
    id: "capability-matrix",
    file: "rcm/payerOps/capability-matrix.ts",
    variable: "matrix",
    description: "PayerCapability matrix",
    classification: "registry",
    durability: "file_seeded",
    domain: "rcm",
  },
  {
    id: "portal-adapter-configs",
    file: "rcm/payerOps/portal-adapter.ts",
    variable: "configs",
    description: "Portal config per payer",
    classification: "registry",
    durability: "env_gated",
    domain: "rcm",
  },
  {
    id: "portal-batch-batches",
    file: "rcm/connectors/portal-batch-connector.ts",
    variable: "batches",
    description: "Portal batch entries (connector-scoped)",
    classification: "registry",
    durability: "env_gated",
    domain: "rcm",
  },
  {
    id: "sandbox-submissions",
    file: "rcm/connectors/sandbox-connector.ts",
    variable: "submissions",
    description: "Sandbox simulated submissions",
    classification: "dev_only",
    durability: "in_memory_only",
    domain: "rcm",
    notes: "Only active in sandbox/dev mode.",
  },
  {
    id: "ph-connector-submissions",
    file: "rcm/connectors/philhealth-connector.ts",
    variable: "submissions",
    description: "PhilHealth connector submission tracking",
    classification: "registry",
    durability: "env_gated",
    domain: "rcm",
  },
  {
    id: "export-bridges",
    file: "rcm/payments/export-bridge.ts",
    variable: "bridges",
    description: "Export format bridges",
    classification: "registry",
    durability: "env_gated",
    domain: "rcm",
  },
  {
    id: "polling-timers",
    file: "rcm/jobs/polling-scheduler.ts",
    variable: "timers",
    description: "Polling job timers + configs",
    classification: "registry",
    durability: "env_gated",
    domain: "rcm",
  },
  {
    id: "rcm-job-queue",
    file: "rcm/jobs/queue.ts",
    variable: "jobs",
    description: "RCM job queue + idempotency index",
    classification: "critical",
    durability: "in_memory_only",
    domain: "rcm",
    migrationTarget: "pg: rcm_job_queue table",
    notes: "Phase 136: job queue state lost on restart. Jobs may be re-enqueued.",
  },
  {
    id: "ai-model-registry",
    file: "ai/model-registry.ts",
    variable: "models",
    description: "AI model configs",
    classification: "registry",
    durability: "file_seeded",
    domain: "ai",
  },
  {
    id: "ai-prompt-registry",
    file: "ai/prompt-registry.ts",
    variable: "prompts",
    description: "AI prompt templates",
    classification: "registry",
    durability: "file_seeded",
    domain: "ai",
  },
  {
    id: "ai-provider-instances",
    file: "ai/providers/index.ts",
    variable: "providerRegistry",
    description: "AI provider instances",
    classification: "registry",
    durability: "env_gated",
    domain: "ai",
  },
  {
    id: "rag-providers",
    file: "ai/rag-engine.ts",
    variable: "providers",
    description: "RAG context providers",
    classification: "registry",
    durability: "env_gated",
    domain: "ai",
  },
  {
    id: "biometric-providers",
    file: "auth/biometric/index.ts",
    variable: "providers",
    description: "Biometric auth providers",
    classification: "registry",
    durability: "env_gated",
    domain: "auth",
  },
  {
    id: "idp-providers",
    file: "auth/idp/index.ts",
    variable: "providers",
    description: "Identity providers",
    classification: "registry",
    durability: "env_gated",
    domain: "auth",
  },
  {
    id: "intake-pack-registry",
    file: "intake/pack-registry.ts",
    variable: "packRegistry",
    description: "Intake form packs",
    classification: "registry",
    durability: "file_seeded",
    domain: "intake",
  },

  // ═══════════════════════════════════════════════════════════
  // AUDIT TRAILS (array-based, append-only, often with JSONL file sink)
  // ═══════════════════════════════════════════════════════════
  {
    id: "iam-audit-ring",
    file: "lib/immutable-audit.ts",
    variable: "auditRing",
    description: "IAM/security audit ring buffer (10K FIFO) + JSONL file",
    classification: "audit",
    durability: "jsonl_backed",
    domain: "auth",
    maxSize: 10_000,
    notes: "Dual sink: in-memory ring + logs/immutable-audit.jsonl.",
  },
  {
    id: "imaging-audit-chain",
    file: "services/imaging-audit.ts",
    variable: "auditChain",
    description: "Imaging audit hash chain + JSONL file",
    classification: "audit",
    durability: "jsonl_backed",
    domain: "imaging",
    notes: "Hash-chained with JSONL file sink.",
  },
  {
    id: "rcm-audit-entries",
    file: "rcm/audit/rcm-audit.ts",
    variable: "entries",
    description: "RCM audit hash chain (20K FIFO)",
    classification: "audit",
    durability: "jsonl_backed",
    domain: "rcm",
    maxSize: 20_000,
    notes: "Phase 38: hash-chained with FIFO eviction.",
  },
  {
    id: "portal-audit-store",
    file: "services/portal-audit.ts",
    variable: "store",
    description: "Portal audit events (5K FIFO)",
    classification: "audit",
    durability: "in_memory_only",
    domain: "portal",
    maxSize: 5_000,
    migrationTarget: "jsonl or pg: portal_audit table",
    notes: "Phase 136: portal audit has no file sink — only in-memory.",
  },
  {
    id: "portal-pending-docs",
    file: "routes/portal-documents.ts",
    variable: "pendingDocs",
    description: "Short-lived signed download tokens for generated documents",
    classification: "cache",
    durability: "in_memory_only",
    domain: "portal",
    ttlMs: 300_000,
    maxSize: 10_000,
    notes: "Phase 140: single-use HMAC-signed tokens, auto-purged every 60s. Loss = user re-generates.",
  },
  {
    id: "analytics-event-buffer",
    file: "services/analytics-store.ts",
    variable: "eventBuffer",
    description: "Analytics event ring buffer + JSONL file",
    classification: "audit",
    durability: "jsonl_backed",
    domain: "analytics",
    notes: "Phase 25: configurable ring buffer with JSONL file sink.",
  },

  // ═══════════════════════════════════════════════════════════
  // DEV/QA ONLY
  // ═══════════════════════════════════════════════════════════
  {
    id: "dead-click-tracker",
    file: "routes/qa-routes.ts",
    variable: "deadClicks",
    description: "Dead-click tracker (500 max, QA_ROUTES_ENABLED)",
    classification: "dev_only",
    durability: "env_gated",
    domain: "qa",
    maxSize: 500,
    notes: "Only active when QA_ROUTES_ENABLED=true.",
  },
  {
    id: "rpc-trace-buffer",
    file: "qa/rpc-trace.ts",
    variable: "buffer",
    description: "RPC trace ring buffer (5000 max, env-gated)",
    classification: "dev_only",
    durability: "env_gated",
    domain: "qa",
    maxSize: 5_000,
  },
  {
    id: "qa-flow-catalog",
    file: "qa/flow-catalog.ts",
    variable: "catalog",
    description: "QA flow definitions",
    classification: "dev_only",
    durability: "env_gated",
    domain: "qa",
  },
];

// ─── Query helpers ──────────────────────────────────────────

/** Get all stores matching a classification */
export function getStoresByClassification(
  classification: StoreClassification
): StoreEntry[] {
  return STORE_INVENTORY.filter((s) => s.classification === classification);
}

/** Get all stores for a domain */
export function getStoresByDomain(domain: string): StoreEntry[] {
  return STORE_INVENTORY.filter((s) => s.domain === domain);
}

/** Get all critical stores that are in-memory only (policy violations in rc/prod) */
export function getCriticalInMemoryStores(): StoreEntry[] {
  return STORE_INVENTORY.filter(
    (s) => s.classification === "critical" && s.durability === "in_memory_only"
  );
}

/** Get cache stores that lack TTL or maxSize declarations */
export function getCacheStoresWithoutLimits(): StoreEntry[] {
  return STORE_INVENTORY.filter(
    (s) =>
      s.classification === "cache" &&
      (s.ttlMs === undefined || s.ttlMs === 0) &&
      (s.maxSize === undefined || s.maxSize === 0)
  );
}

/** Get inventory summary for posture endpoint */
export function getStoreInventorySummary(): {
  total: number;
  byClassification: Record<string, number>;
  byDurability: Record<string, number>;
  byDomain: Record<string, number>;
  criticalInMemoryCount: number;
  cacheWithoutLimitsCount: number;
  policyViolations: StoreEntry[];
} {
  const byClassification: Record<string, number> = {};
  const byDurability: Record<string, number> = {};
  const byDomain: Record<string, number> = {};

  for (const store of STORE_INVENTORY) {
    byClassification[store.classification] =
      (byClassification[store.classification] || 0) + 1;
    byDurability[store.durability] =
      (byDurability[store.durability] || 0) + 1;
    byDomain[store.domain] = (byDomain[store.domain] || 0) + 1;
  }

  const criticalInMemory = getCriticalInMemoryStores();
  const cacheWithoutLimits = getCacheStoresWithoutLimits();

  return {
    total: STORE_INVENTORY.length,
    byClassification,
    byDurability,
    byDomain,
    criticalInMemoryCount: criticalInMemory.length,
    cacheWithoutLimitsCount: cacheWithoutLimits.length,
    policyViolations: criticalInMemory,
  };
}
