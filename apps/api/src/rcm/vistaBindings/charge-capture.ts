/**
 * VistA Binding: Charge Capture Candidates
 *
 * Reads VistA PCE encounters that have billable procedures but
 * no corresponding IB charge, generating a "charge capture candidate"
 * list for the billing workflow.
 *
 * Target RPCs:
 *   ORWPCE PCE4NOTE    — PCE data for a note
 *   IBD FIND CHARGES   — Find IB charges for a patient
 *   ORWCV VST          — Visit list for a patient
 *
 * Target VistA files:
 *   ^AUPNVSIT(9000010) — Visit file
 *   ^AUPNVCPT(9000010.18) — V CPT file
 *   ^IB(350)            — IB Action file
 *
 * VistA-first: returns integration-pending in sandbox with exact targets.
 *
 * Phase 40 (Superseding) — VistA-first binding points
 */

/* ─── Types ──────────────────────────────────────────────────── */

export interface ChargeCapturCandidate {
  visitIen: string;
  patientDfn: string;
  dateOfService: string;
  locationName?: string;
  providerDuz?: string;
  cptCodes: string[];
  diagnosisCodes: string[];
  hasIbCharge: boolean;          // true if ^IB(350) link exists
  hasClaimRecord: boolean;       // true if ^DGCR(399) link exists
  estimatedCharge?: number;      // cents, estimated from CPT fee schedule
  captureStatus: 'ready' | 'partial' | 'needs_review';
}

export interface ChargeCaptureResult {
  ok: boolean;
  candidates: ChargeCapturCandidate[];
  integrationPending?: boolean;
  vistaGrounding?: {
    vistaFiles: string[];
    targetRoutines: string[];
    migrationPath: string;
    sandboxNote: string;
  };
  errors?: string[];
}

/* ─── Charge capture candidate lookup ────────────────────────── */

/**
 * Find encounters that have CPT codes but no IB charge record,
 * indicating billable services not yet captured in the billing system.
 *
 * In the WorldVistA sandbox, PCE encounters exist but IB charges
 * are empty, so all encounters appear as candidates. Production
 * VistA with IB will filter to only uncaptured encounters.
 */
export async function getChargeCaptureCandidates(
  patientDfn: string,
  options?: {
    dateFrom?: string;    // ISO date
    dateTo?: string;      // ISO date
    locationIen?: string;
  },
): Promise<ChargeCaptureResult> {
  return {
    ok: false,
    candidates: [],
    integrationPending: true,
    vistaGrounding: {
      vistaFiles: [
        '^AUPNVSIT(9000010) -- Visit file',
        '^AUPNVCPT(9000010.18) -- V CPT file',
        '^IB(350) -- IB Action file (charges)',
        '^DGCR(399) -- Outpatient Encounter file',
      ],
      targetRoutines: [
        'ORWCV VST -- Visit list for patient',
        'ORWPCE PCE4NOTE -- CPT codes from encounter',
        'IBD FIND CHARGES -- Check if IB charge exists for encounter',
      ],
      migrationPath: [
        '1. Call ORWCV VST to get patient visit list for date range',
        '2. For each visit, call ORWPCE PCE4NOTE to get CPT codes',
        '3. For each visit, check ^IB(350) for linked IB charge',
        '4. Visits with CPT codes but NO IB charge = charge capture candidates',
        '5. Return candidate list sorted by date descending',
      ].join('\n'),
      sandboxNote: 'WorldVistA Docker has PCE encounters in ^AUPNVSIT. ' +
        'IB charges are empty, so all encounters would appear as candidates. ' +
        'Production VistA with active IB will filter correctly.',
    },
    errors: [
      `Patient ${patientDfn}: charge capture scan not available in sandbox. ` +
      'PCE encounters exist but IB charge linkage (^IB(350)) is empty.',
    ],
  };
}

/**
 * Check insurance eligibility from VistA patient insurance file.
 *
 * Target VistA file: ^DPT(DFN,"I") — Patient Insurance entries
 * Target RPC: IBCN INSURANCE LIST — List patient insurance policies
 */
export async function getVistaInsurancePolicies(
  patientDfn: string,
): Promise<{
  ok: boolean;
  policies: Array<{
    insuranceIen: string;
    companyName: string;
    subscriberId?: string;
    groupNumber?: string;
    effectiveDate?: string;
    expirationDate?: string;
  }>;
  integrationPending: boolean;
}> {
  return {
    ok: false,
    policies: [],
    integrationPending: true,
  };
}
