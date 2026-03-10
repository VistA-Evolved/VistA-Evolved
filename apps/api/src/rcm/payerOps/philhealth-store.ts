/**
 * PhilHealth eClaims 3.0 Posture -- In-Memory Store
 *
 * Phase 90: Claim draft + facility setup stores.
 *
 * Pattern: matches imaging-worklist.ts / handoff-store.ts (in-memory Map).
 * Migration plan:
 *   1. In-memory Map (current -- resets on API restart)
 *   2. VistA IB file-backed (when VistA IB/AR files available)
 *   3. PostgreSQL (when SaaS multi-tenant needed)
 */

import { randomBytes, createHmac, randomUUID } from 'node:crypto';
import { log } from '../../lib/logger.js';
import {
  PH_CLAIM_TRANSITIONS,
  requiresRealIntegration,
  DEFAULT_READINESS_CHECKLIST,
  type PhilHealthClaimDraft,
  type PhilHealthClaimStatus,
  type PhilHealthFacilitySetup,
  type PhilHealthElectronicSoa,
  type PhilHealthExportManifest,
  type PhilHealthTestUploadResult,
  type PhilHealthProviderAccreditation,
} from './philhealth-types.js';

/* -- ID generation -------------------------------------------- */

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`;
}

/* -- Claim Draft Store ---------------------------------------- */

const claimDrafts = new Map<string, PhilHealthClaimDraft>();

/* Phase 146: DB repo wiring */

function dbWarn(e: unknown): void {
  log.warn('PhilHealth store PG write-through failed', { error: String(e) });
}

type DurabilityRepo = {
  upsert(d: any): Promise<any>;
  update?(id: string, u: any): Promise<any>;
} | null;
let phDraftDbRepo: DurabilityRepo = null;
let phFacilityDbRepo: DurabilityRepo = null;
export function initPhilHealthStoreRepo(repo: DurabilityRepo): void {
  phDraftDbRepo = repo;
}
export function initPhFacilityStoreRepo(repo: DurabilityRepo): void {
  phFacilityDbRepo = repo;
}

function facilitySetupKey(tenantId: string, facilityId: string): string {
  return `${tenantId}:${facilityId}`;
}

export function createPhilHealthClaimDraft(data: {
  tenantId: string;
  facilityId: string;
  patientDfn: string;
  patientLastName: string;
  patientFirstName: string;
  patientMiddleName?: string;
  patientDob?: string;
  patientSex?: 'M' | 'F';
  philhealthPin: string;
  memberPin?: string;
  memberRelationship?: 'S' | 'D' | 'P';
  encounterIen?: string;
  admissionDate: string;
  dischargeDate?: string;
  patientType: 'O' | 'I';
  caseRateCode?: string;
  caseRateDescription?: string;
  createdBy: string;
}): PhilHealthClaimDraft {
  const id = newId('phclaim');
  const now = new Date().toISOString();
  const draft: PhilHealthClaimDraft = {
    id,
    tenantId: data.tenantId,
    facilityId: data.facilityId,
    patientDfn: data.patientDfn,
    patientLastName: data.patientLastName,
    patientFirstName: data.patientFirstName,
    patientMiddleName: data.patientMiddleName,
    patientDob: data.patientDob,
    patientSex: data.patientSex,
    philhealthPin: data.philhealthPin,
    memberPin: data.memberPin,
    memberRelationship: data.memberRelationship || 'S',
    encounterIen: data.encounterIen,
    admissionDate: data.admissionDate,
    dischargeDate: data.dischargeDate,
    patientType: data.patientType,
    caseRateCode: data.caseRateCode,
    caseRateDescription: data.caseRateDescription,
    diagnoses: [],
    procedures: [],
    charges: [],
    professionalFees: [],
    attachmentRefs: [],
    status: 'draft',
    timeline: [
      {
        timestamp: now,
        action: 'created',
        actor: data.createdBy,
        toStatus: 'draft',
        detail: 'PhilHealth claim draft created',
      },
    ],
    createdBy: data.createdBy,
    createdAt: now,
    updatedAt: now,
  };
  claimDrafts.set(id, draft);

  // Phase 146: Write-through to PG
  phDraftDbRepo
    ?.upsert({
      id,
      tenantId: draft.tenantId,
      patientDfn: draft.patientDfn,
      status: draft.status,
      createdAt: draft.createdAt,
    })
    .catch(dbWarn);

  return draft;
}

export function getPhilHealthClaimDraft(
  tenantId: string,
  id: string
): PhilHealthClaimDraft | undefined {
  const draft = claimDrafts.get(id);
  if (!draft || draft.tenantId !== tenantId) return undefined;
  return draft;
}

export function listPhilHealthClaimDrafts(filter?: {
  tenantId: string;
  facilityId?: string;
  patientDfn?: string;
  status?: PhilHealthClaimStatus;
}): PhilHealthClaimDraft[] {
  let results = Array.from(claimDrafts.values()).filter((c) => c.tenantId === filter?.tenantId);
  if (filter?.facilityId) results = results.filter((c) => c.facilityId === filter.facilityId);
  if (filter?.patientDfn) results = results.filter((c) => c.patientDfn === filter.patientDfn);
  if (filter?.status) results = results.filter((c) => c.status === filter.status);
  return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function patchPhilHealthClaimDraft(
  tenantId: string,
  id: string,
  patch: Partial<
    Pick<
      PhilHealthClaimDraft,
      | 'patientLastName'
      | 'patientFirstName'
      | 'patientMiddleName'
      | 'patientDob'
      | 'patientSex'
      | 'philhealthPin'
      | 'memberPin'
      | 'memberRelationship'
      | 'admissionDate'
      | 'dischargeDate'
      | 'patientType'
      | 'caseRateCode'
      | 'caseRateDescription'
      | 'diagnoses'
      | 'procedures'
      | 'charges'
      | 'professionalFees'
      | 'attachmentRefs'
    >
  >
): { ok: boolean; error?: string; draft?: PhilHealthClaimDraft } {
  const draft = getPhilHealthClaimDraft(tenantId, id);
  if (!draft) return { ok: false, error: 'Claim draft not found' };
  if (draft.status !== 'draft' && draft.status !== 'ready_for_submission') {
    return {
      ok: false,
      error: `Cannot edit claim in status "${draft.status}". Only draft/ready_for_submission allowed.`,
    };
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      (draft as any)[key] = value;
    }
  }
  draft.updatedAt = new Date().toISOString();

  // Phase 146: Write-through patch
  phDraftDbRepo
    ?.upsert({
      id,
      tenantId: draft.tenantId,
      status: draft.status,
      updatedAt: draft.updatedAt,
    })
    .catch(dbWarn);

  return { ok: true, draft };
}

export function transitionPhilHealthClaimStatus(
  tenantId: string,
  id: string,
  newStatus: PhilHealthClaimStatus,
  actor: string,
  reason?: string
): { ok: boolean; error?: string; draft?: PhilHealthClaimDraft } {
  const draft = getPhilHealthClaimDraft(tenantId, id);
  if (!draft) return { ok: false, error: 'Claim draft not found' };

  const allowed = PH_CLAIM_TRANSITIONS[draft.status];
  if (!allowed?.includes(newStatus)) {
    return {
      ok: false,
      error: `Cannot transition from "${draft.status}" to "${newStatus}". Allowed: ${allowed?.join(', ') || 'none'}`,
    };
  }

  // Block real-submission statuses unless real integration is configured
  if (requiresRealIntegration(newStatus)) {
    const hasRealIntegration =
      !!process.env.PHILHEALTH_API_TOKEN && process.env.PHILHEALTH_TEST_MODE === 'false';
    if (!hasRealIntegration) {
      return {
        ok: false,
        error: `Status "${newStatus}" requires real PhilHealth integration. Current mode: test/simulated.`,
      };
    }
  }

  const now = new Date().toISOString();
  draft.timeline.push({
    timestamp: now,
    action: `status_change`,
    actor,
    fromStatus: draft.status,
    toStatus: newStatus,
    detail: reason,
  });
  draft.status = newStatus;
  draft.updatedAt = now;

  // Phase 146: Write-through transition
  phDraftDbRepo
    ?.upsert({
      id,
      tenantId: draft.tenantId,
      status: draft.status,
      updatedAt: draft.updatedAt,
    })
    .catch(dbWarn);

  return { ok: true, draft };
}

/* -- Export Pipeline ------------------------------------------- */

export function generateExportPackage(
  tenantId: string,
  id: string,
  actor: string,
  signingKey?: string
): {
  ok: boolean;
  error?: string;
  manifest?: PhilHealthExportManifest;
  draft?: PhilHealthClaimDraft;
} {
  const draft = getPhilHealthClaimDraft(tenantId, id);
  if (!draft) return { ok: false, error: 'Claim draft not found' };
  if (draft.status !== 'ready_for_submission' && draft.status !== 'exported') {
    return {
      ok: false,
      error: `Export requires status "ready_for_submission" or "exported". Current: "${draft.status}"`,
    };
  }

  // Generate electronic SOA from charges
  const soa = generateSoaFromDraft(draft, actor, signingKey);
  draft.soaElectronic = soa;

  const now = new Date().toISOString();
  const exportId = `exp-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;

  const files: PhilHealthExportManifest['files'] = [
    { name: 'manifest.json', type: 'manifest', format: 'json' },
    { name: 'claim-bundle.json', type: 'claim_bundle', format: 'json' },
    { name: 'soa-electronic.json', type: 'soa', format: 'json' },
  ];
  for (let i = 0; i < draft.attachmentRefs.length; i++) {
    files.push({
      name: `attachment-${i + 1}.json`,
      type: 'attachment',
      format: 'json',
    });
  }

  const totalCharges = draft.charges.reduce((s, c) => s + c.netAmount, 0);

  const manifest: PhilHealthExportManifest = {
    exportId,
    generatedAt: now,
    generatedBy: actor,
    version: '3.0',
    files,
    claimSummary: {
      claimId: draft.id,
      patientType: draft.patientType,
      admissionDate: draft.admissionDate,
      dischargeDate: draft.dischargeDate,
      totalCharges: Math.round(totalCharges * 100) / 100,
      diagnosisCount: draft.diagnoses.length,
      procedureCount: draft.procedures.length,
      hasSoa: true,
      hasProfessionalFees: draft.professionalFees.length > 0,
    },
  };

  draft.lastExportAt = now;
  draft.lastExportManifest = manifest;

  // Auto-transition to exported if currently ready_for_submission
  if (draft.status === 'ready_for_submission') {
    draft.timeline.push({
      timestamp: now,
      action: 'exported',
      actor,
      fromStatus: draft.status,
      toStatus: 'exported',
      detail: `Export package generated: ${exportId}`,
    });
    draft.status = 'exported';
  }

  draft.updatedAt = now;

  // Phase 146: Write-through export
  phDraftDbRepo
    ?.upsert({
      id,
      tenantId: draft.tenantId,
      status: draft.status,
      updatedAt: draft.updatedAt,
    })
    .catch(dbWarn);

  return { ok: true, manifest, draft };
}

/* -- SOA Generation from Draft -------------------------------- */

function generateSoaFromDraft(
  draft: PhilHealthClaimDraft,
  preparedBy: string,
  signingKey?: string
): PhilHealthElectronicSoa {
  const totals = draft.charges.reduce(
    (acc, item) => ({
      totalCharges: acc.totalCharges + item.unitCharge * item.quantity,
      totalDiscount: acc.totalDiscount + item.discount,
      totalNetAmount: acc.totalNetAmount + item.netAmount,
      totalPhicCoverage: acc.totalPhicCoverage + item.phicCoverage,
      totalPatientShare: acc.totalPatientShare + item.patientShare,
    }),
    {
      totalCharges: 0,
      totalDiscount: 0,
      totalNetAmount: 0,
      totalPhicCoverage: 0,
      totalPatientShare: 0,
    }
  );

  // Round to 2 decimal places
  for (const key of Object.keys(totals) as Array<keyof typeof totals>) {
    totals[key] = Math.round(totals[key] * 100) / 100;
  }

  const now = new Date().toISOString();
  const soa: PhilHealthElectronicSoa = {
    soaId: `SOA-${randomUUID().slice(0, 8).toUpperCase()}`,
    version: '3.0',
    lineItems: draft.charges,
    totals,
    preparedBy,
    preparedDate: now.slice(0, 10),
    generatedAt: now,
  };

  if (signingKey) {
    const payload = JSON.stringify({
      soaId: soa.soaId,
      claimId: draft.id,
      facilityId: draft.facilityId,
      totals: soa.totals,
    });
    soa.signature = createHmac('sha256', signingKey).update(payload).digest('hex');
    soa.signatureMethod = 'hmac-sha256';
  }

  return soa;
}

/* -- Test Upload Simulator ------------------------------------ */

export function simulateTestUpload(
  tenantId: string,
  id: string,
  actor: string,
  validationErrors: string[],
  validationWarnings: string[]
): {
  ok: boolean;
  error?: string;
  result?: PhilHealthTestUploadResult;
  draft?: PhilHealthClaimDraft;
} {
  const draft = getPhilHealthClaimDraft(tenantId, id);
  if (!draft) return { ok: false, error: 'Claim draft not found' };
  if (draft.status !== 'exported') {
    return {
      ok: false,
      error: `Test upload requires status "exported". Current: "${draft.status}"`,
    };
  }

  const validationPassed = validationErrors.length === 0;
  const fakeTcn = `SIMULATED-TCN-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;

  const result: PhilHealthTestUploadResult = {
    simulated: true,
    transmittalControlNumber: validationPassed ? fakeTcn : '',
    uploadedAt: new Date().toISOString(),
    validationPassed,
    validationErrors,
    validationWarnings,
    nextSteps: [
      'Register facility with PhilHealth eClaims 3.0 portal',
      'Enroll TLS client certificate with PhilHealth PKI',
      'Request API credentials from PhilHealth IT',
      'Submit test claim to PhilHealth eClaims 3.0 sandbox',
      'Verify TCN returned by PhilHealth web service',
      'Complete facility certification with PhilHealth regional office',
    ],
  };

  draft.testUploadResult = result;

  if (validationPassed) {
    const now = new Date().toISOString();
    draft.timeline.push({
      timestamp: now,
      action: 'test_uploaded',
      actor,
      fromStatus: draft.status,
      toStatus: 'test_uploaded',
      detail: `Simulated test upload passed. TCN: ${fakeTcn}`,
    });
    draft.status = 'test_uploaded';
    draft.updatedAt = now;

    // Phase 146: Write-through test upload
    phDraftDbRepo
      ?.upsert({
        id,
        tenantId: draft.tenantId,
        status: draft.status,
        updatedAt: draft.updatedAt,
      })
      .catch(dbWarn);
  }

  return { ok: true, result, draft };
}

/* -- Facility Setup Store ------------------------------------- */

const facilitySetups = new Map<string, PhilHealthFacilitySetup>();

export function getOrCreateFacilitySetup(
  tenantId: string,
  facilityId: string
): PhilHealthFacilitySetup {
  const key = facilitySetupKey(tenantId, facilityId);
  let setup = facilitySetups.get(key);
  if (!setup) {
    const now = new Date().toISOString();
    setup = {
      id: newId('phsetup'),
      tenantId,
      facilityId,
      facilityCode: '',
      facilityName: '',
      accreditationNumber: '',
      testMode: true,
      providerAccreditations: [],
      readinessChecklist: DEFAULT_READINESS_CHECKLIST.map((item) => ({
        ...item,
        completedAt: undefined,
        completedBy: undefined,
      })),
      createdAt: now,
      updatedAt: now,
    };
    facilitySetups.set(key, setup);

    // Phase 146: Write-through facility create
    phFacilityDbRepo
      ?.upsert({
        id: setup.id,
        tenantId,
        facilityId,
        facilityCode: setup.facilityCode,
        createdAt: setup.createdAt,
      })
      .catch(dbWarn);
  }
  return setup;
}

export function updateFacilitySetup(
  tenantId: string,
  facilityId: string,
  patch: Partial<
    Pick<
      PhilHealthFacilitySetup,
      | 'facilityCode'
      | 'facilityName'
      | 'accreditationNumber'
      | 'accreditationExpiry'
      | 'apiEndpoint'
      | 'testMode'
      | 'integrationNotes'
    >
  >
): PhilHealthFacilitySetup {
  const setup = getOrCreateFacilitySetup(tenantId, facilityId);
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      (setup as any)[key] = value;
    }
  }
  setup.updatedAt = new Date().toISOString();

  // Phase 146: Write-through facility update
  phFacilityDbRepo
    ?.upsert({
      id: setup.id,
      tenantId,
      facilityId: setup.facilityId,
      facilityCode: setup.facilityCode,
      updatedAt: setup.updatedAt,
    })
    .catch(dbWarn);

  return setup;
}

export function addProviderAccreditation(
  tenantId: string,
  facilityId: string,
  provider: PhilHealthProviderAccreditation
): PhilHealthFacilitySetup {
  const setup = getOrCreateFacilitySetup(tenantId, facilityId);
  setup.providerAccreditations.push(provider);
  setup.updatedAt = new Date().toISOString();
  return setup;
}

export function removeProviderAccreditation(
  tenantId: string,
  facilityId: string,
  prcLicenseNumber: string
): PhilHealthFacilitySetup {
  const setup = getOrCreateFacilitySetup(tenantId, facilityId);
  setup.providerAccreditations = setup.providerAccreditations.filter(
    (p) => p.prcLicenseNumber !== prcLicenseNumber
  );
  setup.updatedAt = new Date().toISOString();
  return setup;
}

export function updateReadinessItem(
  tenantId: string,
  facilityId: string,
  itemId: string,
  completed: boolean,
  actor: string
): PhilHealthFacilitySetup {
  const setup = getOrCreateFacilitySetup(tenantId, facilityId);
  const item = setup.readinessChecklist.find((i) => i.id === itemId);
  if (item) {
    item.completed = completed;
    item.completedAt = completed ? new Date().toISOString() : undefined;
    item.completedBy = completed ? actor : undefined;
  }
  setup.updatedAt = new Date().toISOString();
  return setup;
}

/* -- Stats ---------------------------------------------------- */

export function getPhilHealthStats(tenantId?: string): {
  claimDrafts: { total: number; byStatus: Record<string, number> };
  facilitySetups: number;
} {
  const byStatus: Record<string, number> = {};
  const drafts = tenantId
    ? Array.from(claimDrafts.values()).filter((d) => d.tenantId === tenantId)
    : Array.from(claimDrafts.values());
  for (const d of drafts) {
    byStatus[d.status] = (byStatus[d.status] || 0) + 1;
  }
  const facilityCount = tenantId
    ? Array.from(facilitySetups.values()).filter((s) => s.tenantId === tenantId).length
    : facilitySetups.size;
  return {
    claimDrafts: { total: drafts.length, byStatus },
    facilitySetups: facilityCount,
  };
}
