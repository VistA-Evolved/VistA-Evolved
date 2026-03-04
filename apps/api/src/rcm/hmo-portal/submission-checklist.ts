/**
 * HMO Submission Checklist Engine — Phase 517 (Wave 37 B5)
 *
 * Provides a per-HMO checklist for manual and portal-assisted
 * claim/LOA submission workflows. Each HMO has different requirements
 * (attachment types, LOA formats, portal quirks).
 *
 * The checklist is data-driven: templates defined per-HMO,
 * state tracked in-memory (with DB-ready interfaces).
 */

import { randomBytes } from 'node:crypto';

/* ── Types ───────────────────────────────────────────────── */

export type ChecklistItemStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked';

export interface ChecklistItem {
  id: string;
  stepKey: string;
  label: string;
  description: string;
  category: 'documentation' | 'verification' | 'submission' | 'confirmation';
  required: boolean;
  status: ChecklistItemStatus;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  sortOrder: number;
}

export interface SubmissionChecklist {
  id: string;
  payerId: string;
  claimOrLoaId: string;
  workflowType: 'claim' | 'loa';
  items: ChecklistItem[];
  overallStatus: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  completenessPercent: number;
  createdAt: string;
  updatedAt: string;
}

/* ── Checklist Templates ─────────────────────────────────── */

interface ChecklistTemplate {
  stepKey: string;
  label: string;
  description: string;
  category: ChecklistItem['category'];
  required: boolean;
}

const COMMON_CLAIM_STEPS: ChecklistTemplate[] = [
  {
    stepKey: 'verify_member',
    label: 'Verify member eligibility',
    description: 'Confirm HMO card and member ID are valid',
    category: 'verification',
    required: true,
  },
  {
    stepKey: 'attach_loa',
    label: 'Attach approved LOA',
    description: 'Ensure LOA approval is attached to the claim',
    category: 'documentation',
    required: true,
  },
  {
    stepKey: 'attach_clinical',
    label: 'Attach clinical documents',
    description: 'Lab results, imaging, physician notes as required',
    category: 'documentation',
    required: true,
  },
  {
    stepKey: 'review_icd',
    label: 'Review ICD-10 codes',
    description: 'Verify diagnosis codes match clinical documentation',
    category: 'verification',
    required: true,
  },
  {
    stepKey: 'compute_charges',
    label: 'Finalize charges',
    description: 'Confirm room/board, drugs, labs, PF breakdown',
    category: 'documentation',
    required: true,
  },
  {
    stepKey: 'submit_portal',
    label: 'Submit via portal',
    description: 'Upload to HMO portal or send via email/fax',
    category: 'submission',
    required: true,
  },
  {
    stepKey: 'confirm_receipt',
    label: 'Confirm receipt',
    description: 'Get reference number or acknowledgement from HMO',
    category: 'confirmation',
    required: true,
  },
];

const COMMON_LOA_STEPS: ChecklistTemplate[] = [
  {
    stepKey: 'verify_member',
    label: 'Verify member eligibility',
    description: 'Confirm HMO card/ID and coverage tier',
    category: 'verification',
    required: true,
  },
  {
    stepKey: 'draft_loa',
    label: 'Draft LOA request',
    description: 'Fill in patient details, diagnosis, and requested services',
    category: 'documentation',
    required: true,
  },
  {
    stepKey: 'attach_referral',
    label: 'Attach referral (if needed)',
    description: 'Some HMOs require primary care physician referral',
    category: 'documentation',
    required: false,
  },
  {
    stepKey: 'submit_loa',
    label: 'Submit LOA request',
    description: 'Upload to HMO portal or call LOA hotline',
    category: 'submission',
    required: true,
  },
  {
    stepKey: 'track_status',
    label: 'Track LOA status',
    description: 'Follow up until approved or denied',
    category: 'confirmation',
    required: true,
  },
];

/** Per-HMO overrides (additional steps or modified labels) */
const HMO_SPECIFIC_STEPS: Record<
  string,
  { claim?: ChecklistTemplate[]; loa?: ChecklistTemplate[] }
> = {
  'PH-MAXICARE': {
    claim: [
      {
        stepKey: 'maxicare_soa',
        label: 'Generate Maxicare SOA',
        description: 'Maxicare requires their proprietary SOA format',
        category: 'documentation',
        required: true,
      },
    ],
    loa: [
      {
        stepKey: 'maxicare_preauth_code',
        label: 'Get Maxicare pre-auth code',
        description: 'Call 1-800-MAXICARE for pre-authorization code',
        category: 'verification',
        required: true,
      },
    ],
  },
  'PH-MEDICARD': {
    loa: [
      {
        stepKey: 'medicard_online_loa',
        label: 'Use MediCard online LOA',
        description: 'MediCard has online LOA submission at members.medicard.com.ph',
        category: 'submission',
        required: true,
      },
    ],
  },
  'PH-INTELLICARE': {
    claim: [
      {
        stepKey: 'intellicare_batch',
        label: 'Batch with IntelliCare portal',
        description: 'IntelliCare accepts batch uploads via their provider portal',
        category: 'submission',
        required: false,
      },
    ],
  },
};

/* ── Checklist Factory ───────────────────────────────────── */

export function createChecklistId(): string {
  return `ckl-${randomBytes(8).toString('hex')}`;
}

export function buildChecklist(
  payerId: string,
  claimOrLoaId: string,
  workflowType: 'claim' | 'loa'
): SubmissionChecklist {
  const baseSteps = workflowType === 'claim' ? COMMON_CLAIM_STEPS : COMMON_LOA_STEPS;
  const hmoExtra = HMO_SPECIFIC_STEPS[payerId]?.[workflowType] ?? [];

  const allSteps = [...baseSteps, ...hmoExtra];

  const items: ChecklistItem[] = allSteps.map((t, i) => ({
    id: `${createChecklistId()}-${i}`,
    stepKey: t.stepKey,
    label: t.label,
    description: t.description,
    category: t.category,
    required: t.required,
    status: 'pending' as const,
    sortOrder: i + 1,
  }));

  return {
    id: createChecklistId(),
    payerId,
    claimOrLoaId,
    workflowType,
    items,
    overallStatus: 'not_started',
    completenessPercent: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/* ── Checklist store (in-memory, DB-ready interface) ──────── */

const checklistStore = new Map<string, SubmissionChecklist>();

export function getChecklist(id: string): SubmissionChecklist | undefined {
  return checklistStore.get(id);
}

export function getChecklistByRef(claimOrLoaId: string): SubmissionChecklist | undefined {
  for (const cl of checklistStore.values()) {
    if (cl.claimOrLoaId === claimOrLoaId) return cl;
  }
  return undefined;
}

export function saveChecklist(checklist: SubmissionChecklist): void {
  checklistStore.set(checklist.id, checklist);
}

export function listChecklists(payerId?: string): SubmissionChecklist[] {
  const all = Array.from(checklistStore.values());
  if (payerId) return all.filter((c) => c.payerId === payerId);
  return all;
}

/* ── Checklist operations ────────────────────────────────── */

function recalcStatus(checklist: SubmissionChecklist): void {
  const required = checklist.items.filter((i) => i.required);
  const completed = required.filter((i) => i.status === 'completed' || i.status === 'skipped');
  const blocked = required.some((i) => i.status === 'blocked');

  checklist.completenessPercent =
    required.length > 0 ? Math.round((completed.length / required.length) * 100) : 100;

  if (blocked) {
    checklist.overallStatus = 'blocked';
  } else if (checklist.completenessPercent === 100) {
    checklist.overallStatus = 'completed';
  } else if (checklist.completenessPercent > 0) {
    checklist.overallStatus = 'in_progress';
  } else {
    checklist.overallStatus = 'not_started';
  }

  checklist.updatedAt = new Date().toISOString();
}

export function updateChecklistItem(
  checklistId: string,
  itemId: string,
  status: ChecklistItemStatus,
  actor?: string,
  notes?: string
): SubmissionChecklist | undefined {
  const cl = checklistStore.get(checklistId);
  if (!cl) return undefined;

  const item = cl.items.find((i) => i.id === itemId);
  if (!item) return undefined;

  item.status = status;
  if (status === 'completed') {
    item.completedAt = new Date().toISOString();
    item.completedBy = actor;
  }
  if (notes) item.notes = notes;

  recalcStatus(cl);
  checklistStore.set(checklistId, cl);
  return cl;
}

/**
 * Initialize a checklist for a given claim or LOA.
 * Idempotent — returns existing if already created.
 */
export function initChecklist(
  payerId: string,
  claimOrLoaId: string,
  workflowType: 'claim' | 'loa'
): SubmissionChecklist {
  const existing = getChecklistByRef(claimOrLoaId);
  if (existing) return existing;

  const cl = buildChecklist(payerId, claimOrLoaId, workflowType);
  checklistStore.set(cl.id, cl);
  return cl;
}
