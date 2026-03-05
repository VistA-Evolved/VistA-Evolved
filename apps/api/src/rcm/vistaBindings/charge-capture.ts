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

export interface ChargeCaptureCandidate {
  visitIen: string;
  patientDfn: string;
  dateOfService: string;
  locationName?: string;
  providerDuz?: string;
  cptCodes: string[];
  diagnosisCodes: string[];
  hasIbCharge: boolean; // true if ^IB(350) link exists
  hasClaimRecord: boolean; // true if ^DGCR(399) link exists
  estimatedCharge?: number; // cents, estimated from CPT fee schedule
  captureStatus: 'ready' | 'partial' | 'needs_review';
}

export interface ChargeCaptureResult {
  ok: boolean;
  candidates: ChargeCaptureCandidate[];
  integrationPending?: boolean;
  vistaGrounding?: {
    vistaFiles: string[];
    targetRoutines: string[];
    migrationPath: string;
    sandboxNote: string;
  };
  errors?: string[];
}

/* ─── VistA RPC imports ──────────────────────────────────────── */

let safeCallRpc: ((rpc: string, params: string[]) => Promise<string[]>) | null = null;

/**
 * Wire the RPC caller. Called at startup so charge-capture can be
 * imported without circular deps on rpc-resilience.
 */
export function wireChargeCaptureRpc(
  caller: (rpc: string, params: string[]) => Promise<string[]>
): void {
  safeCallRpc = caller;
}

/* ─── RPC response parsers ──────────────────────────────────── */

function parseVisitList(lines: string[]): Array<{ ien: string; date: string; location: string }> {
  return lines
    .filter((l) => l.trim())
    .map((line) => {
      const parts = line.split('^');
      return {
        ien: parts[0] || '',
        date: parts[1] || '',
        location: parts[2] || '',
      };
    })
    .filter((v) => v.ien);
}

function parsePceData(lines: string[]): { cptCodes: string[]; diagnosisCodes: string[] } {
  const cptCodes: string[] = [];
  const diagnosisCodes: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('CPT^')) {
      const code = trimmed.split('^')[1];
      if (code) cptCodes.push(code);
    } else if (trimmed.startsWith('POV^') || trimmed.startsWith('DX^')) {
      const code = trimmed.split('^')[1];
      if (code) diagnosisCodes.push(code);
    }
  }
  return { cptCodes, diagnosisCodes };
}

/* ─── Charge capture candidate lookup ────────────────────────── */

/**
 * Find encounters that have CPT codes but no IB charge record,
 * indicating billable services not yet captured in the billing system.
 *
 * Uses ORWCV VST for visit list and ORWPCE PCE4NOTE for CPT codes.
 * IB charge lookup (^IB(350)) is integration-pending in sandbox.
 */
export async function getChargeCaptureCandidates(
  patientDfn: string,
  options?: {
    dateFrom?: string;
    dateTo?: string;
    locationIen?: string;
  }
): Promise<ChargeCaptureResult> {
  if (!safeCallRpc) {
    return {
      ok: false,
      candidates: [],
      integrationPending: true,
      vistaGrounding: {
        vistaFiles: ['^AUPNVSIT(9000010)', '^AUPNVCPT(9000010.18)', '^IB(350)'],
        targetRoutines: ['ORWCV VST', 'ORWPCE PCE4NOTE', 'IBD FIND CHARGES'],
        migrationPath: 'RPC caller not wired at startup',
        sandboxNote: 'Call wireChargeCaptureRpc() in index.ts',
      },
    };
  }

  try {
    const visitLines = await safeCallRpc('ORWCV VST', [patientDfn]);
    const visits = parseVisitList(visitLines);

    if (visits.length === 0) {
      return { ok: true, candidates: [] };
    }

    const candidates: ChargeCaptureCandidate[] = [];
    const maxVisits = Math.min(visits.length, 50);

    for (let i = 0; i < maxVisits; i++) {
      const visit = visits[i];
      try {
        const pceLines = await safeCallRpc('ORWPCE PCE4NOTE', [visit.ien, patientDfn]);
        const { cptCodes, diagnosisCodes } = parsePceData(pceLines);

        if (cptCodes.length > 0) {
          candidates.push({
            visitIen: visit.ien,
            patientDfn,
            dateOfService: visit.date,
            locationName: visit.location,
            cptCodes,
            diagnosisCodes,
            hasIbCharge: false,
            hasClaimRecord: false,
            captureStatus: diagnosisCodes.length > 0 ? 'ready' : 'needs_review',
          });
        }
      } catch {
        // Skip visits where PCE data is not available
      }
    }

    return {
      ok: true,
      candidates: candidates.sort(
        (a, b) => new Date(b.dateOfService).getTime() - new Date(a.dateOfService).getTime()
      ),
      integrationPending: false,
      vistaGrounding: {
        vistaFiles: ['^AUPNVSIT(9000010)', '^AUPNVCPT(9000010.18)'],
        targetRoutines: ['ORWCV VST', 'ORWPCE PCE4NOTE'],
        migrationPath:
          'IB charge lookup (IBD FIND CHARGES) not available in sandbox. ' +
          'All encounters shown as candidates. Production VistA will filter by IB linkage.',
        sandboxNote: 'Visit + CPT data is live from VistA. IB charge cross-reference pending.',
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      candidates: [],
      errors: [err?.message || 'RPC call failed'],
      vistaGrounding: {
        vistaFiles: ['^AUPNVSIT(9000010)', '^AUPNVCPT(9000010.18)', '^IB(350)'],
        targetRoutines: ['ORWCV VST', 'ORWPCE PCE4NOTE'],
        migrationPath: 'RPC call error -- check VistA connectivity',
        sandboxNote: err?.message || 'Unknown error',
      },
    };
  }
}

/**
 * Get insurance policies from VistA for a patient.
 * Uses IBCN INSURANCE QUERY RPC.
 */
export async function getVistaInsurancePolicies(patientDfn: string): Promise<{
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
  if (!safeCallRpc) {
    return { ok: false, policies: [], integrationPending: true };
  }

  try {
    const lines = await safeCallRpc('IBCN INSURANCE QUERY', [patientDfn]);
    const policies = lines
      .filter((l) => l.trim())
      .map((line) => {
        const parts = line.split('^');
        return {
          insuranceIen: parts[0] || '',
          companyName: parts[1] || '',
          subscriberId: parts[2] || undefined,
          groupNumber: parts[3] || undefined,
          effectiveDate: parts[4] || undefined,
          expirationDate: parts[5] || undefined,
        };
      })
      .filter((p) => p.insuranceIen);

    return { ok: true, policies, integrationPending: false };
  } catch {
    return { ok: false, policies: [], integrationPending: true };
  }
}
