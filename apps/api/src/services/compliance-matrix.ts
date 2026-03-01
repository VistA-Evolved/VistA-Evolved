/**
 * compliance-matrix.ts — Maps regulatory requirements to implementation evidence.
 *
 * Each compliance obligation is linked to:
 *   - The regulatory framework (HIPAA, DPA_PH, DPA_GH)
 *   - The specific requirement clause
 *   - The implementation artifact(s) that satisfy it
 *   - Current compliance status
 *
 * Phase 315 (W13-P7)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RegulatoryFramework = 'HIPAA' | 'DPA_PH' | 'DPA_GH';
export type ComplianceStatus = 'implemented' | 'partial' | 'planned' | 'not_applicable';
export type EvidenceType = 'code' | 'config' | 'documentation' | 'test' | 'audit' | 'process';

export interface ComplianceEvidence {
  type: EvidenceType;
  artifact: string;          // File path or description
  description: string;
  phaseIntroduced: number;
}

export interface ComplianceRequirement {
  id: string;                // e.g. "HIPAA-164.312-a1"
  framework: RegulatoryFramework;
  clause: string;            // e.g. "164.312(a)(1)"
  title: string;
  description: string;
  category: string;          // e.g. "access-control", "audit", "encryption"
  status: ComplianceStatus;
  evidence: ComplianceEvidence[];
  notes: string;
}

export interface ComplianceMatrix {
  generatedAt: string;
  version: string;
  frameworks: RegulatoryFramework[];
  requirements: ComplianceRequirement[];
}

export interface ComplianceSummary {
  framework: RegulatoryFramework;
  total: number;
  implemented: number;
  partial: number;
  planned: number;
  notApplicable: number;
  coveragePercent: number;   // (implemented + partial) / (total - notApplicable) * 100
}

// ---------------------------------------------------------------------------
// HIPAA Requirements
// ---------------------------------------------------------------------------

const HIPAA_REQUIREMENTS: ComplianceRequirement[] = [
  {
    id: 'HIPAA-164.312-a1',
    framework: 'HIPAA',
    clause: '164.312(a)(1)',
    title: 'Access Control',
    description: 'Implement technical policies and procedures for electronic information systems that maintain ePHI to allow access only to authorized persons or software programs.',
    category: 'access-control',
    status: 'implemented',
    evidence: [
      { type: 'code', artifact: 'apps/api/src/auth/policy-engine.ts', description: 'Default-deny policy engine with ~40 action mappings', phaseIntroduced: 35 },
      { type: 'code', artifact: 'apps/api/src/middleware/module-guard.ts', description: 'Module-level route access control', phaseIntroduced: 37 },
      { type: 'code', artifact: 'apps/api/src/services/imaging-authz.ts', description: 'Imaging RBAC + break-glass', phaseIntroduced: 24 },
    ],
    notes: 'RBAC enforced at route, module, and resource levels.',
  },
  {
    id: 'HIPAA-164.312-a2i',
    framework: 'HIPAA',
    clause: '164.312(a)(2)(i)',
    title: 'Unique User Identification',
    description: 'Assign a unique name and/or number for identifying and tracking user identity.',
    category: 'access-control',
    status: 'implemented',
    evidence: [
      { type: 'code', artifact: 'apps/api/src/vista/rpcBrokerClient.ts', description: 'VistA DUZ-based user identification', phaseIntroduced: 1 },
      { type: 'code', artifact: 'apps/api/src/auth/oidc-provider.ts', description: 'OIDC subject claim mapping', phaseIntroduced: 35 },
    ],
    notes: 'VistA DUZ (internal entry number) serves as unique identifier. OIDC sub maps to DUZ.',
  },
  {
    id: 'HIPAA-164.312-a2iii',
    framework: 'HIPAA',
    clause: '164.312(a)(2)(iii)',
    title: 'Automatic Logoff',
    description: 'Implement electronic procedures that terminate an electronic session after a predetermined time of inactivity.',
    category: 'access-control',
    status: 'implemented',
    evidence: [
      { type: 'code', artifact: 'apps/api/src/platform/pg/pg-migrate.ts', description: 'Session TTL in database', phaseIntroduced: 103 },
      { type: 'code', artifact: 'apps/api/src/vista/rpcBrokerClient.ts', description: 'Socket idle timeout (5 min) forces reconnection', phaseIntroduced: 14 },
    ],
    notes: 'Session expiry + socket idle timeout provide layered auto-logoff.',
  },
  {
    id: 'HIPAA-164.312-a2iv',
    framework: 'HIPAA',
    clause: '164.312(a)(2)(iv)',
    title: 'Encryption and Decryption',
    description: 'Implement a mechanism to encrypt and decrypt ePHI.',
    category: 'encryption',
    status: 'partial',
    evidence: [
      { type: 'config', artifact: 'apps/api/.env.example', description: 'Cookie secure flag alignment with runtime mode', phaseIntroduced: 153 },
      { type: 'documentation', artifact: 'docs/runbooks/phase107-production-posture.md', description: 'TLS requirement documented for production', phaseIntroduced: 107 },
    ],
    notes: 'TLS enforced in rc/prod mode. At-rest encryption depends on deployment infrastructure (PG, S3 bucket policies).',
  },
  {
    id: 'HIPAA-164.312-b',
    framework: 'HIPAA',
    clause: '164.312(b)',
    title: 'Audit Controls',
    description: 'Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use ePHI.',
    category: 'audit',
    status: 'implemented',
    evidence: [
      { type: 'code', artifact: 'apps/api/src/lib/immutable-audit.ts', description: 'SHA-256 hash-chained immutable audit trail', phaseIntroduced: 35 },
      { type: 'code', artifact: 'apps/api/src/services/imaging-audit.ts', description: 'Imaging-specific audit chain', phaseIntroduced: 24 },
      { type: 'code', artifact: 'apps/api/src/rcm/audit/rcm-audit.ts', description: 'RCM-specific audit chain', phaseIntroduced: 38 },
      { type: 'code', artifact: 'apps/api/src/audit-shipping/shipper.ts', description: 'Audit log shipping to S3/MinIO', phaseIntroduced: 157 },
    ],
    notes: 'Three separate hash-chained audit trails (general, imaging, RCM) + file-based JSONL + S3 shipping.',
  },
  {
    id: 'HIPAA-164.312-c1',
    framework: 'HIPAA',
    clause: '164.312(c)(1)',
    title: 'Integrity',
    description: 'Implement policies and procedures to protect ePHI from improper alteration or destruction.',
    category: 'integrity',
    status: 'implemented',
    evidence: [
      { type: 'code', artifact: 'apps/api/src/lib/immutable-audit.ts', description: 'Hash-chain integrity verification', phaseIntroduced: 35 },
      { type: 'code', artifact: 'apps/api/src/audit-shipping/manifest.ts', description: 'SHA-256 manifest for shipped audit chunks', phaseIntroduced: 157 },
      { type: 'code', artifact: 'apps/api/src/middleware/idempotency.ts', description: 'Idempotency guard prevents duplicate writes', phaseIntroduced: 154 },
    ],
    notes: 'Hash chains detect tampering. Idempotency prevents accidental duplication.',
  },
  {
    id: 'HIPAA-164.312-d',
    framework: 'HIPAA',
    clause: '164.312(d)',
    title: 'Person or Entity Authentication',
    description: 'Implement procedures to verify that a person or entity seeking access to ePHI is the one claimed.',
    category: 'authentication',
    status: 'implemented',
    evidence: [
      { type: 'code', artifact: 'apps/api/src/vista/rpcBrokerClient.ts', description: 'XWB RPC Broker authentication (AV codes)', phaseIntroduced: 1 },
      { type: 'code', artifact: 'apps/api/src/auth/oidc-provider.ts', description: 'OIDC/OAuth2 authentication', phaseIntroduced: 35 },
      { type: 'code', artifact: 'apps/api/src/auth/biometric/passkeys-provider.ts', description: 'WebAuthn passkey authentication', phaseIntroduced: 35 },
    ],
    notes: 'Three auth methods: VistA RPC, OIDC, WebAuthn passkeys.',
  },
  {
    id: 'HIPAA-164.312-e1',
    framework: 'HIPAA',
    clause: '164.312(e)(1)',
    title: 'Transmission Security',
    description: 'Implement technical security measures to guard against unauthorized access to ePHI that is being transmitted over an electronic communications network.',
    category: 'encryption',
    status: 'partial',
    evidence: [
      { type: 'code', artifact: 'apps/api/src/routes/hardening-routes.ts', description: 'Cookie secure flag in rc/prod', phaseIntroduced: 153 },
      { type: 'documentation', artifact: 'docs/runbooks/phase107-production-posture.md', description: 'TLS termination guidance', phaseIntroduced: 107 },
    ],
    notes: 'TLS termination is infrastructure-dependent. Cookie secure flags enforced in rc/prod.',
  },
  {
    id: 'HIPAA-164.530-c',
    framework: 'HIPAA',
    clause: '164.530(c)',
    title: 'Minimum Necessary',
    description: 'Limit the use and disclosure of PHI to the minimum necessary to accomplish the intended purpose.',
    category: 'data-minimization',
    status: 'implemented',
    evidence: [
      { type: 'code', artifact: 'apps/api/src/lib/phi-redaction.ts', description: 'PHI redaction for audit/logging', phaseIntroduced: 151 },
      { type: 'code', artifact: 'apps/api/src/services/analytics-store.ts', description: 'Analytics events structurally lack DFN', phaseIntroduced: 25 },
      { type: 'config', artifact: 'services/observability/otel-collector-config.yaml', description: 'OTel collector strips PHI attributes', phaseIntroduced: 36 },
    ],
    notes: 'PHI redacted from logs, analytics, and telemetry. DFN excluded from audit payloads.',
  },
  {
    id: 'HIPAA-164.524',
    framework: 'HIPAA',
    clause: '164.524',
    title: 'Access of Individuals to PHI',
    description: 'Individual has a right to inspect and obtain a copy of PHI about them.',
    category: 'patient-rights',
    status: 'implemented',
    evidence: [
      { type: 'code', artifact: 'apps/api/src/routes/portal-auth.ts', description: 'Patient portal with authenticated access', phaseIntroduced: 130 },
      { type: 'code', artifact: 'apps/api/src/services/clinical-reports.ts', description: 'Clinical report pipeline for patient data', phaseIntroduced: 25 },
    ],
    notes: 'Patient portal provides self-service access to clinical data.',
  },
  {
    id: 'HIPAA-BREACH',
    framework: 'HIPAA',
    clause: '164.404-408',
    title: 'Breach Notification',
    description: 'Notification requirements following a breach of unsecured PHI.',
    category: 'breach',
    status: 'planned',
    evidence: [],
    notes: 'Breach notification workflow not yet implemented. Audit trail provides forensic evidence.',
  },
  {
    id: 'HIPAA-BAA',
    framework: 'HIPAA',
    clause: '164.502(e)',
    title: 'Business Associate Agreements',
    description: 'Must have BAA with business associates who handle PHI.',
    category: 'contracts',
    status: 'not_applicable',
    evidence: [
      { type: 'documentation', artifact: 'docs/market/target-markets.md', description: 'BAA requirement documented', phaseIntroduced: 309 },
    ],
    notes: 'BAAs are deployment-specific legal contracts, not software features.',
  },
];

// ---------------------------------------------------------------------------
// DPA Philippines Requirements
// ---------------------------------------------------------------------------

const DPA_PH_REQUIREMENTS: ComplianceRequirement[] = [
  {
    id: 'DPA_PH-SEC16',
    framework: 'DPA_PH',
    clause: 'Section 16',
    title: 'Rights of Data Subject',
    description: 'Right to be informed, access, object, erasure, rectification, data portability.',
    category: 'patient-rights',
    status: 'implemented',
    evidence: [
      { type: 'code', artifact: 'apps/api/src/services/consent-engine.ts', description: 'All-or-nothing consent with revocation', phaseIntroduced: 312 },
      { type: 'code', artifact: 'apps/api/src/routes/consent-routes.ts', description: 'Consent grant/revoke endpoints', phaseIntroduced: 312 },
    ],
    notes: 'Right to erasure and portability reflected in country pack featureFlags.',
  },
  {
    id: 'DPA_PH-SEC20',
    framework: 'DPA_PH',
    clause: 'Section 20',
    title: 'Security Measures',
    description: 'Organizational, physical, and technical security measures for personal data.',
    category: 'security',
    status: 'implemented',
    evidence: [
      { type: 'code', artifact: 'apps/api/src/auth/policy-engine.ts', description: 'Policy engine (default-deny)', phaseIntroduced: 35 },
      { type: 'code', artifact: 'apps/api/src/lib/immutable-audit.ts', description: 'Immutable audit trail', phaseIntroduced: 35 },
    ],
    notes: 'Layered security: RBAC, audit, session management, CSRF, rate limiting.',
  },
  {
    id: 'DPA_PH-SEC21',
    framework: 'DPA_PH',
    clause: 'Section 21',
    title: 'Consent Requirement',
    description: 'Processing requires consent of the data subject unless exceptions apply.',
    category: 'consent',
    status: 'implemented',
    evidence: [
      { type: 'code', artifact: 'apps/api/src/services/consent-engine.ts', description: 'DPA_PH profile: all-or-nothing, no defaults granted', phaseIntroduced: 312 },
      { type: 'config', artifact: 'country-packs/PH/values.json', description: 'consentRequired: true, granularity: all-or-nothing', phaseIntroduced: 314 },
    ],
    notes: 'PH requires explicit consent for all categories. No TPO auto-grant.',
  },
  {
    id: 'DPA_PH-SEC12',
    framework: 'DPA_PH',
    clause: 'Section 12',
    title: 'Cross-Border Transfer',
    description: 'Transfer of personal data to foreign country requires adequate protection.',
    category: 'data-transfer',
    status: 'implemented',
    evidence: [
      { type: 'code', artifact: 'apps/api/src/platform/data-residency.ts', description: 'Cross-border transfer validation', phaseIntroduced: 311 },
      { type: 'config', artifact: 'country-packs/PH/values.json', description: 'crossBorderTransferAllowed: true with consent', phaseIntroduced: 314 },
    ],
    notes: 'Transfer requires explicit patient consent (requiresConsentForTransfer: true).',
  },
  {
    id: 'DPA_PH-NPC-REG',
    framework: 'DPA_PH',
    clause: 'NPC Circular 16-01',
    title: 'Data Breach Notification',
    description: 'Personal data breach must be reported to NPC within 72 hours.',
    category: 'breach',
    status: 'planned',
    evidence: [],
    notes: 'Breach notification workflow not yet implemented. Audit trail provides evidence.',
  },
  {
    id: 'DPA_PH-RETENTION',
    framework: 'DPA_PH',
    clause: 'Section 11(e)',
    title: 'Data Retention',
    description: 'Personal data shall be retained only for as long as necessary.',
    category: 'retention',
    status: 'implemented',
    evidence: [
      { type: 'config', artifact: 'country-packs/PH/values.json', description: 'retentionMinYears: 5, retentionMaxYears: 10', phaseIntroduced: 314 },
      { type: 'code', artifact: 'apps/api/src/platform/data-residency.ts', description: 'Retention policy in region assignment', phaseIntroduced: 311 },
    ],
    notes: 'PH mandates max 10-year retention. Enforcement at infrastructure level.',
  },
];

// ---------------------------------------------------------------------------
// DPA Ghana Requirements
// ---------------------------------------------------------------------------

const DPA_GH_REQUIREMENTS: ComplianceRequirement[] = [
  {
    id: 'DPA_GH-SEC17',
    framework: 'DPA_GH',
    clause: 'Section 17',
    title: 'Rights of Data Subject',
    description: 'Right to access, rectification, erasure, and data portability.',
    category: 'patient-rights',
    status: 'implemented',
    evidence: [
      { type: 'code', artifact: 'apps/api/src/services/consent-engine.ts', description: 'DPA_GH profile: all-or-nothing consent', phaseIntroduced: 312 },
      { type: 'config', artifact: 'country-packs/GH/values.json', description: 'rightToErasure: true, dataPortability: true', phaseIntroduced: 314 },
    ],
    notes: 'Ghana DPA mirrors PH DPA on data subject rights.',
  },
  {
    id: 'DPA_GH-SEC26',
    framework: 'DPA_GH',
    clause: 'Section 26',
    title: 'Data Security',
    description: 'Appropriate technical and organizational measures to protect personal data.',
    category: 'security',
    status: 'implemented',
    evidence: [
      { type: 'code', artifact: 'apps/api/src/auth/policy-engine.ts', description: 'Policy engine', phaseIntroduced: 35 },
      { type: 'code', artifact: 'apps/api/src/lib/immutable-audit.ts', description: 'Immutable audit', phaseIntroduced: 35 },
    ],
    notes: 'Same security infrastructure applies across all markets.',
  },
  {
    id: 'DPA_GH-SEC37',
    framework: 'DPA_GH',
    clause: 'Section 37',
    title: 'Cross-Border Transfer',
    description: 'Transfer requires adequate level of protection in receiving country.',
    category: 'data-transfer',
    status: 'implemented',
    evidence: [
      { type: 'code', artifact: 'apps/api/src/platform/data-residency.ts', description: 'Cross-border validation with consent check', phaseIntroduced: 311 },
      { type: 'config', artifact: 'country-packs/GH/values.json', description: 'crossBorderTransferAllowed: true, requiresConsentForTransfer: true', phaseIntroduced: 314 },
    ],
    notes: 'gh-acc region is planned. Initial deployments use "local" region.',
  },
  {
    id: 'DPA_GH-SEC30',
    framework: 'DPA_GH',
    clause: 'Section 30',
    title: 'Consent',
    description: 'Processing requires free and informed consent of the data subject.',
    category: 'consent',
    status: 'implemented',
    evidence: [
      { type: 'code', artifact: 'apps/api/src/services/consent-engine.ts', description: 'DPA_GH profile: all-or-nothing, defaults denied', phaseIntroduced: 312 },
      { type: 'config', artifact: 'country-packs/GH/values.json', description: 'consentRequired: true, granularity: all-or-nothing', phaseIntroduced: 314 },
    ],
    notes: 'Explicit consent required. No auto-grant.',
  },
  {
    id: 'DPA_GH-BREACH',
    framework: 'DPA_GH',
    clause: 'Section 31',
    title: 'Data Breach Notification',
    description: 'Notification to DPC within 72 hours of becoming aware of a breach.',
    category: 'breach',
    status: 'planned',
    evidence: [],
    notes: 'Planned. Audit trail provides forensic evidence for breach investigation.',
  },
];

// ---------------------------------------------------------------------------
// Matrix Assembly
// ---------------------------------------------------------------------------

const ALL_REQUIREMENTS: ComplianceRequirement[] = [
  ...HIPAA_REQUIREMENTS,
  ...DPA_PH_REQUIREMENTS,
  ...DPA_GH_REQUIREMENTS,
];

/** Build the full compliance matrix. */
export function buildComplianceMatrix(): ComplianceMatrix {
  return {
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
    frameworks: ['HIPAA', 'DPA_PH', 'DPA_GH'],
    requirements: ALL_REQUIREMENTS,
  };
}

/** Summarize compliance status for a framework. */
export function getComplianceSummary(framework: RegulatoryFramework): ComplianceSummary {
  const reqs = ALL_REQUIREMENTS.filter((r) => r.framework === framework);
  const total = reqs.length;
  const implemented = reqs.filter((r) => r.status === 'implemented').length;
  const partial = reqs.filter((r) => r.status === 'partial').length;
  const planned = reqs.filter((r) => r.status === 'planned').length;
  const notApplicable = reqs.filter((r) => r.status === 'not_applicable').length;
  const denominator = total - notApplicable;
  const coveragePercent = denominator > 0
    ? Math.round(((implemented + partial) / denominator) * 100)
    : 100;

  return { framework, total, implemented, partial, planned, notApplicable, coveragePercent };
}

/** Get all requirements for a specific category. */
export function getRequirementsByCategory(category: string): ComplianceRequirement[] {
  return ALL_REQUIREMENTS.filter((r) => r.category === category);
}

/** Get all requirements with a specific status. */
export function getRequirementsByStatus(status: ComplianceStatus): ComplianceRequirement[] {
  return ALL_REQUIREMENTS.filter((r) => r.status === status);
}

/** Get the full list of unique categories. */
export function getCategories(): string[] {
  return [...new Set(ALL_REQUIREMENTS.map((r) => r.category))].sort();
}

/** Get all evidence artifacts across all requirements. */
export function getAllEvidence(): ComplianceEvidence[] {
  return ALL_REQUIREMENTS.flatMap((r) => r.evidence);
}
