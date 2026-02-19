/**
 * RCM Domain — Claim Entity & Lifecycle
 *
 * Phase 38: VistA-first claim lifecycle model.
 *
 * Claim states mirror the real-world EDI lifecycle:
 *   draft → validated → submitted → accepted/rejected → paid/denied → appealed → closed
 *
 * VistA grounding: WorldVistA Integrated Billing (IB) stores charges in
 * ^IB(350,...) and ^PRCA(430,...) for AR. We read from VistA when available
 * and maintain an overlay store for lifecycle tracking beyond what VistA
 * tracks natively (submission/remit/appeal states are clearinghouse-side).
 */

import { randomUUID } from "node:crypto";

/* ── Claim Lifecycle States ─────────────────────────────────── */

export type ClaimStatus =
  | "draft"
  | "validated"
  | "submitted"
  | "accepted"
  | "rejected"
  | "paid"
  | "denied"
  | "appealed"
  | "closed";

export const CLAIM_STATUS_ORDER: ClaimStatus[] = [
  "draft", "validated", "submitted", "accepted", "rejected",
  "paid", "denied", "appealed", "closed",
];

/** Valid transitions — key = from, values = allowed to states */
export const CLAIM_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  draft:     ["validated", "closed"],
  validated: ["submitted", "draft", "closed"],
  submitted: ["accepted", "rejected", "closed"],
  accepted:  ["paid", "denied", "closed"],
  rejected:  ["draft", "appealed", "closed"],
  paid:      ["closed"],
  denied:    ["appealed", "closed"],
  appealed:  ["accepted", "rejected", "paid", "denied", "closed"],
  closed:    [],
};

export function isValidTransition(from: ClaimStatus, to: ClaimStatus): boolean {
  return CLAIM_TRANSITIONS[from]?.includes(to) ?? false;
}

/* ── Claim Types ────────────────────────────────────────────── */

export type ClaimType = "professional" | "institutional" | "dental" | "pharmacy";

export interface DiagnosisCode {
  code: string;        // e.g. "J06.9"
  codeSystem: "ICD10"; // only ICD-10 for now
  qualifier: "principal" | "admitting" | "other";
  description?: string;
}

export interface ProcedureCode {
  code: string;        // CPT or HCPCS
  codeSystem: "CPT" | "HCPCS";
  modifiers?: string[];
  units: number;
  charge: number;      // in cents
  dateOfService: string; // ISO date
  description?: string;
}

export interface ClaimLine {
  lineNumber: number;
  procedure: ProcedureCode;
  diagnoses: DiagnosisCode[]; // pointers to claim-level dx
  renderingProvider?: string;
  placeOfService?: string;
}

export interface ClaimAuditEntry {
  timestamp: string;
  action: string;
  actor: string;       // DUZ or system
  fromStatus?: ClaimStatus;
  toStatus?: ClaimStatus;
  detail?: string;
}

export interface Claim {
  id: string;
  tenantId: string;
  claimType: ClaimType;
  status: ClaimStatus;

  // Patient
  patientDfn: string;
  patientName?: string;      // redacted in logs
  patientDob?: string;       // redacted in logs
  patientFirstName?: string; // for EDI 837 subscriber/patient segment
  patientLastName?: string;  // for EDI 837 subscriber/patient segment
  patientGender?: string;    // M/F/U
  subscriberId?: string;     // insurance subscriber ID

  // Provider
  billingProviderNpi?: string;
  renderingProviderNpi?: string;
  facilityNpi?: string;
  facilityName?: string;     // for EDI 837 billing provider segment
  facilityTaxId?: string;    // for EDI 837 billing provider segment

  // Payer
  payerId: string;
  payerName?: string;
  payerClaimId?: string;     // assigned by payer after submission

  // Clinical
  dateOfService: string;
  diagnoses: DiagnosisCode[];
  lines: ClaimLine[];
  totalCharge: number;       // sum of line charges, in cents

  // EDI
  ediTransactionId?: string; // X12 837 control number
  connectorId?: string;      // which connector submitted
  submittedAt?: string;
  responseReceivedAt?: string;

  // Remittance
  paidAmount?: number;        // in cents
  adjustmentAmount?: number;  // in cents
  patientResponsibility?: number; // in cents
  remitDate?: string;

  // VistA grounding
  vistaChargeIen?: string;   // ^IB(350,IEN)
  vistaArIen?: string;       // ^PRCA(430,IEN)

  // Lifecycle tracking
  validationResult?: unknown;   // ValidationResult from validation engine
  pipelineEntryId?: string;     // links to EDI pipeline entry

  // Metadata
  isMock: boolean;           // true if generated in sandbox
  auditTrail: ClaimAuditEntry[];
  createdAt: string;
  updatedAt: string;
}

/* ── Factory ────────────────────────────────────────────────── */

export function createDraftClaim(params: {
  tenantId: string;
  patientDfn: string;
  payerId: string;
  claimType?: ClaimType;
  dateOfService: string;
  diagnoses?: DiagnosisCode[];
  lines?: ClaimLine[];
  totalCharge?: number;
  patientName?: string;
  patientDob?: string;
  patientFirstName?: string;
  patientLastName?: string;
  patientGender?: string;
  subscriberId?: string;
  billingProviderNpi?: string;
  renderingProviderNpi?: string;
  facilityNpi?: string;
  facilityName?: string;
  facilityTaxId?: string;
  payerName?: string;
  vistaChargeIen?: string;
  vistaArIen?: string;
  isMock?: boolean;
  actor: string;
}): Claim {
  const now = new Date().toISOString();
  const linesList = params.lines ?? [];
  const totalCharge = params.totalCharge ?? linesList.reduce((sum, l) => sum + l.procedure.charge, 0);

  return {
    id: randomUUID(),
    tenantId: params.tenantId,
    claimType: params.claimType ?? "professional",
    status: "draft",
    patientDfn: params.patientDfn,
    patientName: params.patientName,
    patientDob: params.patientDob,
    patientFirstName: params.patientFirstName,
    patientLastName: params.patientLastName,
    patientGender: params.patientGender,
    subscriberId: params.subscriberId,
    billingProviderNpi: params.billingProviderNpi,
    renderingProviderNpi: params.renderingProviderNpi,
    facilityNpi: params.facilityNpi,
    facilityName: params.facilityName,
    facilityTaxId: params.facilityTaxId,
    payerId: params.payerId,
    payerName: params.payerName,
    vistaChargeIen: params.vistaChargeIen,
    vistaArIen: params.vistaArIen,
    dateOfService: params.dateOfService,
    diagnoses: params.diagnoses ?? [],
    lines: linesList,
    totalCharge,
    isMock: params.isMock ?? false,
    auditTrail: [{
      timestamp: now,
      action: "claim.created",
      actor: params.actor,
      toStatus: "draft",
      detail: "Draft claim created",
    }],
    createdAt: now,
    updatedAt: now,
  };
}

export function transitionClaim(
  claim: Claim,
  toStatus: ClaimStatus,
  actor: string,
  detail?: string,
): Claim {
  if (!isValidTransition(claim.status, toStatus)) {
    throw new Error(`Invalid transition: ${claim.status} → ${toStatus}`);
  }
  const now = new Date().toISOString();
  return {
    ...claim,
    status: toStatus,
    updatedAt: now,
    auditTrail: [
      ...claim.auditTrail,
      {
        timestamp: now,
        action: `claim.${toStatus}`,
        actor,
        fromStatus: claim.status,
        toStatus,
        detail,
      },
    ],
  };
}
