/**
 * EDI Core Types — X12 Transaction Set Definitions
 *
 * Maps all standard HIPAA EDI transaction sets used in US healthcare billing.
 * Provides typed internal representations that bridge X12 wire format ↔ VistA domain.
 *
 * Phase 38 — RCM + Payer Connectivity
 */

/* ─── X12 Transaction Set identifiers ──────────────────────────────── */

export type X12TransactionSet =
  | '837P' // Professional claim
  | '837I' // Institutional claim
  | '835' // Electronic Remittance Advice (ERA)
  | '270' // Eligibility inquiry
  | '271' // Eligibility response
  | '276' // Claim status inquiry
  | '277' // Claim status response
  | '275' // Additional information to support a claim
  | '278' // Prior authorization request/response
  | '999' // Implementation acknowledgment
  | '997' // Functional acknowledgment (legacy)
  | 'TA1'; // Interchange acknowledgment

/* ─── Envelope types ─────────────────────────────────────────────── */

export interface IsaEnvelope {
  senderId: string; // ISA06 - Interchange sender ID
  receiverId: string; // ISA08 - Interchange receiver ID
  senderQualifier: string; // ISA05 - usually 'ZZ' or '30'
  receiverQualifier: string; // ISA07
  controlNumber: string; // ISA13 - unique per interchange
  date: string; // ISA09 - YYMMDD
  time: string; // ISA10 - HHMM
  versionNumber: string; // ISA12 - '00501' for 5010
  usageIndicator: 'T' | 'P'; // ISA15 - Test or Production
}

export interface GsEnvelope {
  functionalCode: string; // GS01 - HC, HP, FA, HN, etc.
  senderId: string; // GS02
  receiverId: string; // GS03
  controlNumber: string; // GS06
  versionCode: string; // GS08 - '005010X222A1' for 837P, etc.
}

/* ─── Claims (837P / 837I) ──────────────────────────────────────── */

export interface EdiClaim837 {
  transactionSet: '837P' | '837I';
  controlNumber: string;
  submitterInfo: {
    name: string;
    taxId: string;
    npi: string;
    contactName?: string;
    contactPhone?: string;
  };
  receiverInfo: {
    name: string;
    entityCode: string;
  };
  billingProvider: {
    name: string;
    npi: string;
    taxId: string;
    taxonomyCode?: string;
    address: EdiAddress;
  };
  subscriber: {
    memberId: string;
    firstName: string;
    lastName: string;
    dob?: string; // CCYYMMDD
    gender?: 'M' | 'F' | 'U';
    groupNumber?: string;
    address?: EdiAddress;
    relationshipCode: string; // '18' = self, '01' = spouse, etc.
  };
  patient?: {
    firstName: string;
    lastName: string;
    dob?: string;
    gender?: 'M' | 'F' | 'U';
    address?: EdiAddress;
    relationshipCode: string;
  };
  claimInfo: {
    claimId: string; // CLM01 - provider's claim number
    totalChargeAmount: number;
    facilityCode: string; // CLM05-1
    frequencyCode: string; // CLM05-3 - '1' original, '7' replacement, '8' void
    providerSignature: boolean;
    assignmentOfBenefits: boolean;
    releaseOfInfo: string;
    patientAccountNumber?: string;
  };
  diagnosisCodes: EdiDiagnosisCode[];
  serviceLines: EdiServiceLine[];
}

export interface EdiAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

export interface EdiDiagnosisCode {
  code: string;
  qualifier: 'ABK' | 'ABF' | 'ABJ'; // ICD-10-CM, ICD-10-PCS, ICD-9
  isPrincipal: boolean;
}

export interface EdiServiceLine {
  lineNumber: number;
  procedureCode: string; // CPT/HCPCS
  modifiers?: string[]; // up to 4
  chargeAmount: number;
  units: number;
  unitType: string; // 'UN' = unit, 'MJ' = minutes
  serviceDate: string; // CCYYMMDD
  serviceDateEnd?: string;
  placeOfService: string; // '11' office, '21' inpatient, '22' outpatient, etc.
  renderingProviderNpi?: string;
  diagnosisPointers: number[]; // 1-based indices into diagnosisCodes[]
  revenueCode?: string; // 837I only (UB-04 revenue codes)
  ndcCode?: string; // National Drug Code (for drug claims)
}

/* ─── Remittance Advice (835) ─────────────────────────────────────── */

export interface EdiRemittance835 {
  transactionSet: '835';
  controlNumber: string;
  checkOrEftNumber: string;
  paymentDate: string; // CCYYMMDD
  totalPaymentAmount: number;
  payerInfo: {
    name: string;
    payerId: string;
    address?: EdiAddress;
  };
  payeeInfo: {
    name: string;
    npi: string;
    taxId?: string;
  };
  claimPayments: EdiClaimPayment[];
}

export interface EdiClaimPayment {
  patientControlNumber: string;
  claimStatus: '1' | '2' | '3' | '4' | '19' | '20' | '21' | '22' | '23' | '25';
  // 1=processed primary, 2=processed secondary, 3=processed tertiary, 4=denied,
  // 19=processed primary fwd, 22=reversal, 23=not our claim
  totalChargedAmount: number;
  paidAmount: number;
  patientResponsibility: number;
  adjustments: EdiRemitAdjustment[];
  serviceLines: EdiRemitServiceLine[];
}

export interface EdiRemitAdjustment {
  groupCode: 'CO' | 'PR' | 'OA' | 'PI' | 'CR';
  reasonCode: string; // CARC code e.g., '45', '29', '1'
  amount: number;
}

export interface EdiRemitServiceLine {
  procedureCode: string;
  modifiers?: string[];
  chargeAmount: number;
  paidAmount: number;
  adjustments: EdiRemitAdjustment[];
  serviceDate: string;
  units?: number;
}

/* ─── Eligibility (270/271) ───────────────────────────────────────── */

export interface EdiEligibilityInquiry270 {
  transactionSet: '270';
  controlNumber: string;
  informationSource: { name: string; payerId: string };
  informationReceiver: { name: string; npi: string };
  subscriber: {
    memberId: string;
    firstName: string;
    lastName: string;
    dob?: string;
    gender?: 'M' | 'F' | 'U';
  };
  serviceTypeCodes: string[]; // '30' = plan coverage, '88' = pharmacy, etc.
  dateOfService?: string;
}

export interface EdiEligibilityResponse271 {
  transactionSet: '271';
  controlNumber: string;
  referenceControlNumber: string; // links back to 270
  subscriberStatus: 'active' | 'inactive' | 'unknown';
  benefitInfo: EdiBenefitInfo[];
  errors?: EdiResponseError[];
}

export interface EdiBenefitInfo {
  serviceTypeCode: string;
  coverageLevel: 'IND' | 'FAM' | 'CHD' | 'EMP' | 'ESP';
  insuranceType?: string;
  timePeriodQualifier?: string; // 'calendar_year', 'visit', 'lifetime'
  benefitAmount?: number;
  benefitPercent?: number;
  inNetworkIndicator?: 'Y' | 'N' | 'W'; // W = not applicable
  authRequired?: boolean;
}

/* ─── Claim Status (276/277) ──────────────────────────────────────── */

export interface EdiClaimStatusInquiry276 {
  transactionSet: '276';
  controlNumber: string;
  payerId: string;
  providerNpi: string;
  patientMemberId: string;
  claimId: string;
  serviceDate?: string;
  chargeAmount?: number;
}

export interface EdiClaimStatusResponse277 {
  transactionSet: '277';
  controlNumber: string;
  referenceControlNumber: string;
  claimStatusCode: string; // A0..A8, E0..E4, etc.
  claimStatusCategory: string; // See X12 278 category codes
  statusDate: string;
  totalChargedAmount?: number;
  paidAmount?: number;
  errors?: EdiResponseError[];
}

/* ─── Prior Authorization (278) ──────────────────────────────────── */

export interface EdiPriorAuth278 {
  transactionSet: '278';
  controlNumber: string;
  direction: 'request' | 'response';
  requestType: 'AR' | 'HS' | 'SC'; // Admission Review, Health Services, Specialty Care
  certificationInfo?: {
    authNumber: string;
    effectiveDate: string;
    expirationDate: string;
    status: 'certified' | 'modified' | 'denied' | 'pended';
  };
  patientInfo: {
    memberId: string;
    firstName: string;
    lastName: string;
    dob?: string;
  };
  providerInfo: { name: string; npi: string };
  serviceInfo: {
    procedureCodes: string[];
    diagnosisCodes: string[];
    requestedUnits?: number;
    facilityCode?: string;
  };
}

/* ─── Attachments (275) ───────────────────────────────────────────── */

export interface EdiAttachment275 {
  transactionSet: '275';
  controlNumber: string;
  claimId: string;
  payerId: string;
  attachmentType: 'clinical' | 'certification' | 'report';
  contentType: string; // MIME type of the attachment
  content: string; // base64-encoded document
  description?: string;
}

/* ─── Acknowledgments (999/997/TA1) ──────────────────────────────── */

export interface EdiAcknowledgment {
  transactionSet: '999' | '997' | 'TA1';
  controlNumber: string;
  referenceControlNumber: string;
  accepted: boolean;
  errors?: EdiResponseError[];
}

/* ─── Shared types ───────────────────────────────────────────────── */

export interface EdiResponseError {
  code: string;
  description: string;
  location?: string; // segment/element reference
  severity: 'info' | 'warning' | 'error' | 'fatal';
}

export type EdiTransaction =
  | EdiClaim837
  | EdiRemittance835
  | EdiEligibilityInquiry270
  | EdiEligibilityResponse271
  | EdiClaimStatusInquiry276
  | EdiClaimStatusResponse277
  | EdiPriorAuth278
  | EdiAttachment275
  | EdiAcknowledgment;

/* ─── Pipeline tracking ──────────────────────────────────────────── */

export type PipelineStage =
  | 'build' // Internal claim → EDI representation
  | 'validate' // Syntax + business rule validation
  | 'enqueue' // Placed in outbound queue
  | 'transmit' // Sent to payer/clearinghouse
  | 'ack_pending' // Awaiting 999/TA1
  | 'ack_received' // Got acknowledgment
  | 'response' // Got substantive response (835, 271, 277)
  | 'reconciled' // Matched back to source claim
  | 'error' // Pipeline error at any stage
  | 'cancelled'; // Cancelled before transmission

export interface PipelineEntry {
  id: string;
  tenantId: string;
  claimId: string;
  transactionSet: X12TransactionSet;
  stage: PipelineStage;
  connectorId: string; // which connector handled it
  payerId: string;
  outboundPayload?: string; // serialized EDI (for audit, not stored long-term)
  inboundPayload?: string; // response EDI
  acknowledgment?: EdiAcknowledgment;
  errors: EdiResponseError[];
  attempts: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
