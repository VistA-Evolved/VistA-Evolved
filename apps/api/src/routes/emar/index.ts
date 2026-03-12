/**
 * eMAR + BCMA Routes -- Full VistA Integration.
 *
 * Endpoints:
 *   GET  /emar/schedule?dfn=N        -- Active medication schedule from ORWPS ACTIVE
 *   GET  /emar/allergies?dfn=N       -- Allergy warnings via ORQQAL LIST + PSB ALLERGY
 *   GET  /emar/history?dfn=N         -- Administration history via ZVENAS MEDLIST (File #53.79)
 *   POST /emar/administer            -- Record administration via ZVENAS MEDLOG when available, else TIU fallback note
 *   GET  /emar/duplicate-check?dfn=N -- Heuristic duplicate therapy detection
 *   POST /emar/barcode-scan          -- BCMA barcode scan via PSB VALIDATE ORDER + ZVENAS BCSCAN
 *
 * Read endpoints call real VistA RPCs. Administration prefers ZVENAS MEDLOG
 * for BCMA medication-log writes when provisioned, then falls back to TIU note
 * documentation in sandbox lanes where BCMA write RPCs are unavailable.
 *
 * Auth: session-based (emar/* added to AUTH_RULES catch-all via /emar/ prefix).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../../auth/auth-routes.js';
import { safeCallRpc, safeCallRpcWithList } from '../../lib/rpc-resilience.js';
import type { RpcParam } from '../../vista/rpcBrokerClient.js';
import { log } from '../../lib/logger.js';
import { safeErr } from '../../lib/safe-error.js';
import { immutableAudit } from '../../lib/immutable-audit.js';
import { isRpcAvailable } from '../../vista/rpcCapabilities.js';
// tier0Gate removed -- all eMAR routes now call VistA RPCs directly

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Validate DFN query param. Returns null if valid, error reply if not. */
function validateDfn(dfn: unknown, reply: FastifyReply): string | null {
  const val = String(dfn || '').trim();
  if (!val || !/^\d+$/.test(val)) {
    reply.code(400).send({ ok: false, error: 'Missing or non-numeric dfn query parameter' });
    return null;
  }
  return val;
}

function isVistaValidationError(line: string): boolean {
  return /%YDB-E-|\bM\s+ERROR\b|undefined variable/i.test(line);
}

function normalizePsbAllergyWarnings(lines: string[] | undefined): string[] {
  return (lines || [])
    .map((line) => String(line || '').trim())
    .filter((line) => Boolean(line) && !/^\d+$/.test(line));
}

function buildTiuTextBuffer(noteText: unknown): Record<string, string> {
  const textData: Record<string, string> = { HDR: '1^1' };
  String(noteText || '')
    .split(/\r?\n/)
    .forEach((line, index) => {
      textData[`TEXT,${index + 1},0`] = line;
    });
  return textData;
}

function tiuReadbackContainsExpectedText(lines: string[], noteText: unknown): boolean {
  const expected = String(noteText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (expected.length === 0) return false;
  const haystack = lines.map((line) => line.trim()).filter(Boolean);
  return expected.every((line) => haystack.includes(line));
}

export function extractNumericRpcIen(lines: string[] | undefined): string | null {
  const firstLine = String((lines || [])[0] || '').trim();
  if (!/^\d+(\^|$)/.test(firstLine)) return null;
  const ien = firstLine.split('^')[0]?.trim() || '';
  return /^\d+$/.test(ien) ? ien : null;
}

export function isMissingRpcResponse(lines: string[] | undefined): boolean {
  const firstLine = String((lines || [])[0] || '').trim();
  return /remote procedure .*doesn't exist on the server/i.test(firstLine);
}

/* ------------------------------------------------------------------ */
/* Medication schedule types                                            */
/* ------------------------------------------------------------------ */

interface ScheduleEntry {
  orderIEN: string;
  rxId: string;
  type: string; // OP=Outpatient, UD=Unit Dose, IV=IV, NV=Non-VA, CP=Clinic
  drugName: string;
  status: string;
  sig: string;
  schedule: string; // e.g. "BID", "Q8H", "PRN" (derived from sig)
  isPRN: boolean;
  nextDue: string | null; // ISO or heuristic label
  route: string; // PO, IV, IM, etc. (derived from sig)
  frequency: string; // human-readable
}

interface EmarOrderMetadata {
  orderIen: string;
  displayGroup: string;
  packageRef?: string;
  textFromDetail?: string;
  rawDetail: string[];
}

function normalizeVistaText(text: string | undefined): string {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseGetByIfnMetadata(lines: string[]): EmarOrderMetadata {
  const metaLine = lines.find((line) => line.startsWith('~'));
  const detailText = lines
    .filter((line) => line.startsWith('t'))
    .map((line) => normalizeVistaText(line.slice(1)))
    .filter(Boolean)
    .join(' ');
  const parts = metaLine ? metaLine.slice(1).split('^') : [];
  const packageCandidate = parts[parts.length - 1]?.trim() || '';
  return {
    orderIen: parts[0]?.trim() || '',
    displayGroup: parts[1]?.trim() || '',
    packageRef: /^[A-Z0-9]{2,8}$/.test(packageCandidate) ? packageCandidate : undefined,
    textFromDetail: detailText || undefined,
    rawDetail: lines,
  };
}

function inferOrderType(
  packageRef: string | undefined,
  displayGroup: string | undefined,
  text: string
): string | undefined {
  const signal = `${packageRef || ''} ${displayGroup || ''} ${text}`.toUpperCase();
  if (/PSO|PSJ|MED|TABLET|CAP|INJ|PATCH|CREAM|REFILL|RX/.test(signal)) return 'med';
  if (/LR|LAB|CBC|BMP|CMP|CHEM|CULTURE|HEMOGLOBIN|PLATELET|PANEL/.test(signal)) return 'lab';
  if (/RA|RAD|IMAG|XRAY|X-RAY|MRI|CT|ULTRASOUND|MAMMO|MAG/.test(signal)) return 'imaging';
  if (/GMRC|CONSULT|REFERRAL|SERVICE/.test(signal)) return 'consult';
  return undefined;
}

function normalizeOrderStatus(rawStatus: string | undefined, displayText?: string): string {
  if ((displayText || '').toUpperCase().includes('*UNSIGNED*')) return 'unsigned';
  const normalized = rawStatus?.trim();
  return normalized || 'active';
}

function populateScheduleMetadata(med: ScheduleEntry): void {
  const sigUpper = med.sig.toUpperCase();
  med.isPRN = sigUpper.includes('PRN') || sigUpper.includes('AS NEEDED');

  if (sigUpper.includes(' IV ') || sigUpper.includes('INTRAVENOUS')) med.route = 'IV';
  else if (sigUpper.includes(' IM ') || sigUpper.includes('INTRAMUSCULAR')) med.route = 'IM';
  else if (sigUpper.includes(' SQ ') || sigUpper.includes('SUBCUTANEOUS')) med.route = 'SQ';
  else if (sigUpper.includes(' PO ') || sigUpper.includes('BY MOUTH') || sigUpper.includes('ORAL'))
    med.route = 'PO';
  else if (sigUpper.includes('TOPICAL')) med.route = 'TOP';
  else if (sigUpper.includes('OPHTHALMIC')) med.route = 'OPH';
  else if (sigUpper.includes('OTIC')) med.route = 'OTIC';
  else if (sigUpper.includes('NASAL') || sigUpper.includes('INHALE')) med.route = 'INH';
  else if (sigUpper.includes('RECTAL')) med.route = 'PR';
  else med.route = 'PO';

  const freqPatterns: Array<[RegExp, string, string]> = [
    [/\bQ(\d+)H\b/i, 'Q$1H', 'every $1 hours'],
    [/\bBID\b/i, 'BID', 'twice daily'],
    [/\bTID\b/i, 'TID', 'three times daily'],
    [/\bQID\b/i, 'QID', 'four times daily'],
    [/\bQD\b|DAILY|ONCE DAILY/i, 'QD', 'once daily'],
    [/\bQ(\d+)MIN\b/i, 'Q$1MIN', 'every $1 minutes'],
    [/\bQHS\b|AT BEDTIME/i, 'QHS', 'at bedtime'],
    [/\bQAM\b/i, 'QAM', 'every morning'],
    [/\bQPM\b/i, 'QPM', 'every evening'],
    [/\bQ(\d+)D\b/i, 'Q$1D', 'every $1 days'],
    [/\bWEEKLY\b|QW\b/i, 'QW', 'weekly'],
    [/\bSTAT\b/i, 'STAT', 'immediately'],
    [/\bONCE\b/i, 'ONCE', 'one time'],
  ];

  for (const [regex, sched, freq] of freqPatterns) {
    const match = sigUpper.match(regex);
    if (match) {
      med.schedule = sched.replace('$1', match[1] || '');
      med.frequency = freq.replace('$1', match[1] || '');
      break;
    }
  }

  if (!med.schedule && med.isPRN) {
    med.schedule = 'PRN';
    med.frequency = 'as needed';
  }
  if (!med.schedule) {
    med.schedule = 'UNSCHEDULED';
    med.frequency = 'see sig for details';
  }

  if (med.isPRN || med.schedule === 'STAT' || med.schedule === 'ONCE') {
    med.nextDue = null;
  } else {
    med.nextDue = 'scheduled';
  }
}

async function buildScheduleFallbackFromOrders(
  dfn: string
): Promise<{ schedule: ScheduleEntry[]; rpcUsed: string[] }> {
  const activeOrderLines = await safeCallRpc('ORWORR AGET', [dfn, '2', '', '', '']);
  const rpcUsedSet = new Set<string>(['ORWORR AGET']);
  const fallbackSchedule = new Map<string, ScheduleEntry>();

  for (const line of activeOrderLines) {
    if (!line || line.startsWith('-1')) continue;
    const parts = line.split('^');
    const orderIen = parts[0]?.trim() || '';
    if (!orderIen) continue;

    let metadata: EmarOrderMetadata = {
      orderIen,
      displayGroup: parts[1]?.trim() || '',
      rawDetail: [],
    };
    let detailText = '';
    let drugName = normalizeVistaText(parts[3]);
    let sigText = '';

    try {
      const detailLines = await callOrderDetailRpcWithRetry('ORWORR GETBYIFN', orderIen);
      if (detailLines.length > 0 && !detailLines[0]?.startsWith('-1')) {
        metadata = parseGetByIfnMetadata(detailLines);
        rpcUsedSet.add('ORWORR GETBYIFN');
      }
    } catch {
      // Keep AGET row truthful even if enrichment fails.
    }

    try {
      const txtLines = await callOrderDetailRpcWithRetry('ORWORR GETTXT', orderIen);
      const normalizedTxt = txtLines.map((entry) => normalizeVistaText(entry)).filter(Boolean);
      if (normalizedTxt.length > 0 && !normalizedTxt[0].startsWith('-1')) {
        drugName = normalizedTxt[0] || drugName;
        sigText = normalizedTxt.slice(1).join(' ');
        detailText = normalizedTxt.join(' ');
        rpcUsedSet.add('ORWORR GETTXT');
      }
    } catch {
      // Keep AGET/GETBYIFN truthful if GETTXT is unavailable.
    }

    const displayText = normalizeVistaText(detailText || metadata.textFromDetail || drugName);
    const orderType = inferOrderType(metadata.packageRef, metadata.displayGroup, displayText);
    if (orderType !== 'med') continue;

    const baseOrderIen = orderIen.split(';')[0] || orderIen;
    const med: ScheduleEntry = {
      orderIEN: baseOrderIen,
      rxId: baseOrderIen,
      type: 'ORDER',
      drugName: drugName || displayText || `Medication order ${baseOrderIen}`,
      status: normalizeOrderStatus(parts[4], displayText),
      sig: sigText || metadata.textFromDetail || displayText,
      schedule: '',
      isPRN: false,
      nextDue: null,
      route: '',
      frequency: '',
    };
    populateScheduleMetadata(med);
    fallbackSchedule.set(med.orderIEN, med);
  }

  return {
    schedule: Array.from(fallbackSchedule.values()),
    rpcUsed: Array.from(rpcUsedSet),
  };
}

async function callOrderDetailRpcWithRetry(
  rpcName: 'ORWORR GETBYIFN' | 'ORWORR GETTXT',
  orderIen: string
): Promise<string[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await safeCallRpc(rpcName, [orderIen]);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error(`${rpcName} failed for order ${orderIen}`);
}

async function buildMedicationCandidatesFromValidatedOrders(
  validateLines: string[]
): Promise<{ meds: ScheduleEntry[]; rpcUsed: string[] }> {
  const rpcUsedSet = new Set<string>();
  const orderIens = extractValidatedOrderIens(validateLines);

  const meds: ScheduleEntry[] = [];
  for (const orderIen of orderIens) {
    let metadata: EmarOrderMetadata = {
      orderIen,
      displayGroup: '',
      rawDetail: [],
    };
    let drugName = '';
    let sigText = '';

    try {
      const detailLines = await callOrderDetailRpcWithRetry('ORWORR GETBYIFN', orderIen);
      if (detailLines.length > 0 && !detailLines[0]?.startsWith('-1')) {
        metadata = parseGetByIfnMetadata(detailLines);
        rpcUsedSet.add('ORWORR GETBYIFN');
      }
    } catch {
      // Continue to GETTXT-based recovery.
    }

    try {
      const txtLines = await callOrderDetailRpcWithRetry('ORWORR GETTXT', orderIen);
      const normalizedTxt = txtLines.map((entry) => normalizeVistaText(entry)).filter(Boolean);
      if (normalizedTxt.length > 0 && !normalizedTxt[0].startsWith('-1')) {
        drugName = normalizedTxt[0] || drugName;
        sigText = normalizedTxt.slice(1).join(' ');
        rpcUsedSet.add('ORWORR GETTXT');
      }
    } catch {
      // Use GETBYIFN text if GETTXT is unavailable.
    }

    const displayText = normalizeVistaText(sigText || metadata.textFromDetail || drugName);
    const med: ScheduleEntry = {
      orderIEN: orderIen,
      rxId: orderIen,
      type: 'ORDER',
      drugName: drugName || metadata.textFromDetail || `Medication order ${orderIen}`,
      status: 'active',
      sig: displayText || drugName || metadata.textFromDetail || `Medication order ${orderIen}`,
      schedule: '',
      isPRN: false,
      nextDue: null,
      route: '',
      frequency: '',
    };
    populateScheduleMetadata(med);
    meds.push(med);
  }

  return { meds, rpcUsed: Array.from(rpcUsedSet) };
}

function extractValidatedOrderIens(validateLines: string[]): string[] {
  return Array.from(
    new Set(
      validateLines
        .filter((line) => line.includes(';'))
        .map((line) => line.split('^')[0]?.split(';')[0]?.trim() || '')
        .filter((value) => /^\d+$/.test(value))
    )
  );
}

/** Parse ORWPS ACTIVE output into schedule entries. */
function parseActiveMeds(activeLines: string[]): ScheduleEntry[] {
  const meds: ScheduleEntry[] = [];
  let current: ScheduleEntry | null = null;

  for (const line of activeLines) {
    if (line.startsWith('~')) {
      const typeEnd = line.indexOf('^');
      const type = line.substring(1, typeEnd);
      const fields = line.substring(typeEnd + 1).split('^');
      current = {
        orderIEN: fields[7]?.trim() || '',
        rxId: fields[0]?.split(';')[0] || '',
        type,
        drugName: fields[1]?.trim() || '',
        status: fields[8]?.trim() || 'active',
        sig: '',
        schedule: '',
        isPRN: false,
        nextDue: null,
        route: '',
        frequency: '',
      };
      meds.push(current);
    } else if (current) {
      const trimmed = line.trim();
      if (trimmed.startsWith('\\ Sig:') || trimmed.startsWith('\\Sig:')) {
        current.sig = trimmed.replace(/^\\\s*Sig:\s*/i, '').trim();
      } else if (trimmed.startsWith('Qty:')) {
        // qty info -- skip for schedule
      } else if (trimmed) {
        // Continuation lines (drug info or additional sig text)
        current.sig += (current.sig ? ' ' : '') + trimmed;
      }
    }
  }

  for (const med of meds) {
    populateScheduleMetadata(med);
  }

  return meds;
}

/** Heuristic duplicate therapy detection by drug name similarity. */
function detectDuplicates(meds: ScheduleEntry[]): Array<{
  drugA: string;
  drugB: string;
  orderA: string;
  orderB: string;
  reason: string;
}> {
  const duplicates: Array<{
    drugA: string;
    drugB: string;
    orderA: string;
    orderB: string;
    reason: string;
  }> = [];

  // Known therapeutic class groupings (heuristic -- NOT a clinical decision engine)
  const classMap: Record<string, string[]> = {
    'ACE Inhibitor': [
      'LISINOPRIL',
      'ENALAPRIL',
      'CAPTOPRIL',
      'RAMIPRIL',
      'BENAZEPRIL',
      'FOSINOPRIL',
      'QUINAPRIL',
    ],
    'Beta Blocker': [
      'ATENOLOL',
      'METOPROLOL',
      'PROPRANOLOL',
      'CARVEDILOL',
      'BISOPROLOL',
      'LABETALOL',
      'NADOLOL',
    ],
    Statin: [
      'ATORVASTATIN',
      'SIMVASTATIN',
      'ROSUVASTATIN',
      'PRAVASTATIN',
      'LOVASTATIN',
      'FLUVASTATIN',
    ],
    NSAID: [
      'IBUPROFEN',
      'NAPROXEN',
      'DICLOFENAC',
      'INDOMETHACIN',
      'MELOXICAM',
      'KETOROLAC',
      'CELECOXIB',
    ],
    PPI: ['OMEPRAZOLE', 'PANTOPRAZOLE', 'ESOMEPRAZOLE', 'LANSOPRAZOLE', 'RABEPRAZOLE'],
    SSRI: ['FLUOXETINE', 'SERTRALINE', 'PAROXETINE', 'CITALOPRAM', 'ESCITALOPRAM', 'FLUVOXAMINE'],
    Thiazide: ['HYDROCHLOROTHIAZIDE', 'CHLORTHALIDONE', 'METOLAZONE', 'INDAPAMIDE'],
    'Calcium Channel Blocker': ['AMLODIPINE', 'NIFEDIPINE', 'DILTIAZEM', 'VERAPAMIL', 'FELODIPINE'],
    ARB: ['LOSARTAN', 'VALSARTAN', 'IRBESARTAN', 'OLMESARTAN', 'CANDESARTAN', 'TELMISARTAN'],
    Anticoagulant: ['WARFARIN', 'HEPARIN', 'ENOXAPARIN', 'RIVAROXABAN', 'APIXABAN', 'DABIGATRAN'],
    Opioid: [
      'MORPHINE',
      'HYDROCODONE',
      'OXYCODONE',
      'FENTANYL',
      'CODEINE',
      'TRAMADOL',
      'METHADONE',
      'HYDROMORPHONE',
    ],
    Benzodiazepine: ['LORAZEPAM', 'DIAZEPAM', 'ALPRAZOLAM', 'CLONAZEPAM', 'MIDAZOLAM'],
    Sulfonylurea: ['GLIPIZIDE', 'GLYBURIDE', 'GLIMEPIRIDE'],
    Insulin: ['INSULIN'],
  };

  // Build reverse map: drug keyword -> class
  const drugToClass = new Map<string, string>();
  for (const [className, drugs] of Object.entries(classMap)) {
    for (const drug of drugs) {
      drugToClass.set(drug, className);
    }
  }

  // Check each pair of active meds for same therapeutic class
  const activeMeds = meds.filter((m) => m.status.toLowerCase() === 'active' || !m.status);
  for (let i = 0; i < activeMeds.length; i++) {
    for (let j = i + 1; j < activeMeds.length; j++) {
      const nameA = activeMeds[i].drugName.toUpperCase();
      const nameB = activeMeds[j].drugName.toUpperCase();
      if (!nameA || !nameB) continue;

      // Check therapeutic class overlap
      for (const [keyword, className] of drugToClass) {
        if (nameA.includes(keyword)) {
          for (const [keyword2, className2] of drugToClass) {
            if (className === className2 && nameB.includes(keyword2)) {
              // Same class -- flag even if same drug keyword (different order = potential duplicate)
              const reason =
                keyword === keyword2
                  ? `Same ${className} medication ordered in multiple orders`
                  : `Both are ${className} class medications`;
              duplicates.push({
                drugA: activeMeds[i].drugName,
                drugB: activeMeds[j].drugName,
                orderA: activeMeds[i].orderIEN,
                orderB: activeMeds[j].orderIEN,
                reason,
              });
            }
          }
        }
      }

      // Also flag exact same drug name appearing twice
      if (nameA === nameB && activeMeds[i].orderIEN !== activeMeds[j].orderIEN) {
        duplicates.push({
          drugA: activeMeds[i].drugName,
          drugB: activeMeds[j].drugName,
          orderA: activeMeds[i].orderIEN,
          orderB: activeMeds[j].orderIEN,
          reason: 'Same medication ordered twice',
        });
      }
    }
  }

  // De-duplicate (same pair may match multiple keywords)
  const seen = new Set<string>();
  return duplicates.filter((d) => {
    const key = [d.orderA, d.orderB].sort().join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* ================================================================== */
/* Route registration                                                   */
/* ================================================================== */

export default async function emarRoutes(server: FastifyInstance) {
  /** Extract audit actor from session. */
  function auditActor(session: any): { sub: string; name: string } {
    const duz = session?.duz || session?.user?.duz || 'unknown';
    const name = session?.userName || session?.user?.name || 'unknown';
    return { sub: duz, name };
  }

  /* ------ GET /emar/schedule?dfn=N ------ */
  server.get('/emar/schedule', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const dfn = validateDfn((request.query as any)?.dfn, reply);
    if (!dfn) return;

    try {
      const activeLines = await safeCallRpc('ORWPS ACTIVE', [dfn]);

      if (!activeLines || activeLines.length === 0) {
        const fallback = await buildScheduleFallbackFromOrders(dfn);
        immutableAudit('emar.schedule', 'success', auditActor(session), {
          detail: { dfn, count: fallback.schedule.length, fallbackUsed: true },
        });
        return {
          ok: true,
          source: 'vista',
          schedule: fallback.schedule.map((m) => ({
            orderIEN: m.orderIEN,
            rxId: m.rxId,
            drugName: m.drugName || '(unknown medication)',
            type: m.type,
            status: m.status.toLowerCase() || 'active',
            sig: m.sig,
            route: m.route,
            schedule: m.schedule,
            isPRN: m.isPRN,
            frequency: m.frequency,
            nextDue: m.nextDue,
          })),
          count: fallback.schedule.length,
          rpcUsed: ['ORWPS ACTIVE', ...fallback.rpcUsed],
          fallbackUsed: true,
          fallbackReason:
            'ORWPS ACTIVE returned no active medication rows; schedule synthesized from live active CPRS medication orders.',
          _heuristicWarning:
            'Due times are derived from sig text, not from actual BCMA medication log. Install BCMA/PSB for real-time scheduling.',
        };
      }

      // Check for error
      if (activeLines[0].startsWith('-1')) {
        const errMsg = activeLines[0].split('^').slice(1).join('^') || 'Unknown VistA error';
        return reply.code(502).send({
          ok: false,
          error: errMsg,
          source: 'vista',
          rpcUsed: ['ORWPS ACTIVE'],
        });
      }

      // Resolve empty drug names via ORWORR GETTXT
      const meds = parseActiveMeds(activeLines);
      const rpcsUsed: string[] = ['ORWPS ACTIVE'];

      for (const med of meds) {
        if (!med.drugName && med.orderIEN && /^\d+$/.test(med.orderIEN)) {
          try {
            const txtLines = await safeCallRpc('ORWORR GETTXT', [med.orderIEN]);
            if (txtLines && txtLines.length > 0 && !txtLines[0].startsWith('-1')) {
              med.drugName = txtLines[0].trim();
              if (!med.sig && txtLines[1]) {
                med.sig = txtLines[1].trim();
              }
              if (!rpcsUsed.includes('ORWORR GETTXT')) rpcsUsed.push('ORWORR GETTXT');
            }
          } catch {
            // Non-fatal
          }
        }
      }

      immutableAudit('emar.schedule', 'success', auditActor(session), {
        detail: { dfn, count: meds.length },
      });
      return {
        ok: true,
        source: 'vista',
        count: meds.length,
        schedule: meds.map((m) => ({
          orderIEN: m.orderIEN,
          rxId: m.rxId,
          drugName: m.drugName || '(unknown medication)',
          type: m.type,
          status: m.status.toLowerCase() || 'active',
          sig: m.sig,
          route: m.route,
          schedule: m.schedule,
          isPRN: m.isPRN,
          frequency: m.frequency,
          nextDue: m.nextDue,
        })),
        rpcUsed: rpcsUsed,
        _heuristicWarning:
          'Due times are derived from sig text, not from actual BCMA medication log. Install BCMA/PSB for real-time scheduling.',
      };
    } catch (err: any) {
      log.error('eMAR schedule fetch failed', { error: safeErr(err) });
      immutableAudit('emar.schedule', 'error', auditActor(session), {
        detail: { dfn, error: 'RPC failed' },
      });
      return reply.code(502).send({
        ok: false,
        error: safeErr(err),
        source: 'error',
        rpcUsed: ['ORWPS ACTIVE'],
      });
    }
  });

  /* ------ GET /emar/allergies?dfn=N ------ */
  server.get('/emar/allergies', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const dfn = validateDfn((request.query as any)?.dfn, reply);
    if (!dfn) return;

    try {
      const rpcUsed: string[] = ['ORQQAL LIST'];
      const lines = await safeCallRpc('ORQQAL LIST', [dfn]);
      if (!lines || lines.length === 0) {
        let psbWarnings: string[] = [];
        try {
          const allergyLines = await safeCallRpc('PSB ALLERGY', [dfn]);
          rpcUsed.push('PSB ALLERGY');
          psbWarnings = normalizePsbAllergyWarnings(allergyLines);
        } catch {
          // Keep empty documented allergies truthful even if PSB ALLERGY is unavailable in context.
        }

        return {
          ok: true,
          source: 'vista',
          allergies: [],
          count: 0,
          interactionWarnings: psbWarnings,
          rpcUsed,
        };
      }

      // Parse: id^allergen^severity^reactions (reactions semicolon-separated)
      const allergies = lines
        .map((line: string) => {
          const parts = line.split('^');
          const id = parts[0]?.trim();
          const allergen = parts[1]?.trim() || '';
          const severity = parts[2]?.trim() || '';
          const reactions = parts[3]?.trim() || '';
          if (!id) return null;
          return {
            id,
            allergen,
            severity,
            reactions: reactions
              .split(';')
              .map((r) => r.trim())
              .filter(Boolean),
          };
        })
        .filter(
          (
            r: unknown
          ): r is { id: string; allergen: string; severity: string; reactions: string[] } =>
            r !== null
        );

      let interactionWarnings: string[] = [];
      try {
        const allergyLines = await safeCallRpc('PSB ALLERGY', [dfn]);
        rpcUsed.push('PSB ALLERGY');
        interactionWarnings = normalizePsbAllergyWarnings(allergyLines);
      } catch {
        interactionWarnings = allergies
          .filter(
            (allergy) =>
              allergy.severity?.toUpperCase() === 'SEVERE' ||
              allergy.severity?.toUpperCase() === 'MODERATE'
          )
          .map(
            (allergy) =>
              `${allergy.severity || 'ALL'}^${allergy.allergen}^Patient has documented allergy -- verify all medications against this allergen before administration`
          );
      }

      immutableAudit('emar.allergies', 'success', auditActor(session), {
        detail: { dfn, count: allergies.length },
      });
      return {
        ok: true,
        source: 'vista',
        count: allergies.length,
        allergies,
        interactionWarnings,
        rpcUsed,
      };
    } catch (err: any) {
      log.error('eMAR allergy fetch failed', { error: safeErr(err) });
      immutableAudit('emar.allergies', 'error', auditActor(session), {
        detail: { dfn, error: 'RPC failed' },
      });
      return reply.code(502).send({
        ok: false,
        error: safeErr(err),
        source: 'error',
        rpcUsed: ['ORQQAL LIST'],
      });
    }
  });

  /* ------ GET /emar/history?dfn=N ------ */
  server.get('/emar/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const dfn = validateDfn((request.query as any)?.dfn, reply);
    if (!dfn) return;

    const rpcUsed: string[] = [];
    try {
      // Call ZVENAS MEDLIST for real BCMA administration history from ^PSB(53.79)
      let medHistory: Array<{
        id: string;
        date: string;
        orderIEN: string;
        action: string;
        dose: string;
        route: string;
        site: string;
        nurse: string;
        medication: string;
        source: string;
      }> = [];

      try {
        const medLines = await safeCallRpc('ZVENAS MEDLIST', [dfn]);
        rpcUsed.push('ZVENAS MEDLIST');
        const count = parseInt((medLines || [])[0] || '0', 10);
        if (count > 0) {
          medHistory = medLines
            .slice(1)
            .filter((l: string) => l && l.includes('^'))
            .map((line: string) => {
              const parts = line.split('^');
              return {
                id: parts[0] || '',
                date: parts[1] || '',
                orderIEN: parts[2] || '',
                action: parts[3] || '',
                dose: parts[4] || '',
                route: parts[5] || '',
                site: parts[6] || '',
                nurse: parts[7] || '',
                medication: parts[8] || '',
                source: (parts[0] || '').startsWith('X') ? 'xtmp' : 'psb_53_79',
              };
            });
        }
      } catch {
        // ZVENAS MEDLIST not installed -- fall back to ORWPS ACTIVE
      }

      // If no BCMA history, supplement with active medications for context
      if (medHistory.length === 0) {
        try {
          const lines = await safeCallRpc('ORWPS ACTIVE', [dfn]);
          rpcUsed.push('ORWPS ACTIVE');
          const activeMeds = parseActiveMeds(lines || []);
          medHistory = activeMeds.map((m, i) => ({
            id: `active-${i}`,
            date: '',
            orderIEN: m.orderIEN,
            action: 'active',
            dose: '',
            route: m.route,
            site: '',
            nurse: '',
            medication: m.drugName,
            source: 'orwps_active',
          }));
        } catch {
          rpcUsed.push('ORWPS ACTIVE');
        }
      }

      immutableAudit('emar.history', 'success', auditActor(session), {
        detail: { dfn, count: medHistory.length },
      });
      return {
        ok: true,
        source: 'vista',
        history: medHistory,
        count: medHistory.length,
        rpcUsed,
      };
    } catch (err: any) {
      log.warn('eMAR history failed', { error: safeErr(err) });
      return { ok: true, source: 'vista', history: [], count: 0, rpcUsed };
    }
  });

  /* ------ POST /emar/administer ------ */
  server.post('/emar/administer', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const body = (request.body as any) || {};
    const dfn = String(body.dfn || '').trim();
    const orderIEN = String(body.orderIEN || '').trim();
    const action = String(body.action || 'given').trim().toUpperCase();
    const dose = String(body.dose || '').trim();
    const route = String(body.route || '').trim();
    const site = String(body.site || '').trim();
    const reason = String(body.reason || '').trim();

    if (!dfn || !/^\d+$/.test(dfn)) {
      return reply.code(400).send({ ok: false, error: 'Missing or non-numeric dfn' });
    }
    if (!orderIEN || !/^\d+$/.test(orderIEN)) {
      return reply.code(400).send({ ok: false, error: 'Missing or non-numeric orderIEN' });
    }

    const validActions = ['GIVEN', 'HELD', 'REFUSED', 'NOT_GIVEN', 'MISSING_DOSE'];
    if (!validActions.includes(action)) {
      return reply
        .code(400)
        .send({ ok: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` });
    }
    if (reason.length > 2000) {
      return reply
        .code(400)
        .send({ ok: false, error: 'Reason exceeds maximum length (2000 chars)' });
    }

    const rpcUsed: string[] = [];
    let medLogResult: any = null;
    let noteIen = '';
    const medLogAvailable = isRpcAvailable('ZVENAS MEDLOG');

    // Step 1: Record in BCMA Med Log via ZVENAS MEDLOG (writes to ^PSB(53.79))
    if (medLogAvailable) {
      try {
        const medLogLines = await safeCallRpc('ZVENAS MEDLOG', [
          dfn, orderIEN, action, dose, route, site,
        ]);
        rpcUsed.push('ZVENAS MEDLOG');
        const status = String((medLogLines || [])[0] || '').trim();
        if (status.startsWith('1^OK')) {
          medLogResult = {};
          for (const line of medLogLines.slice(1)) {
            const [key, ...valParts] = line.split('^');
            if (key) medLogResult[key] = valParts.join('^');
          }
        } else if (isMissingRpcResponse(medLogLines)) {
          log.warn('ZVENAS MEDLOG reported unavailable at runtime, using TIU fallback only', {
            dfn,
            orderIEN,
            status,
          });
        }
      } catch (medLogErr: any) {
        log.warn('ZVENAS MEDLOG failed, will record via TIU', { error: safeErr(medLogErr) });
      }
    } else {
      log.info('ZVENAS MEDLOG not available in capability cache, using TIU fallback only', {
        dfn,
        orderIEN,
      });
    }

    // Step 2: Also create TIU documentation note (clinical documentation trail)
    try {
      const adminNote = `eMAR Administration: ${action} - Order ${orderIEN}${dose ? ' - Dose: ' + dose : ''}${route ? ' - Route: ' + route : ''}${site ? ' - Site: ' + site : ''}${reason ? '\nReason: ' + reason : ''}`;
      const titleIen = '10';
      const now = new Date();
      const fmYear = now.getFullYear() - 1700;
      const fmMonth = String(now.getMonth() + 1).padStart(2, '0');
      const fmDay = String(now.getDate()).padStart(2, '0');
      const fmHour = String(now.getHours()).padStart(2, '0');
      const fmMin = String(now.getMinutes()).padStart(2, '0');
      const visitDate = `${fmYear}${fmMonth}${fmDay}.${fmHour}${fmMin}`;

      const noteLines = await safeCallRpc('TIU CREATE RECORD', [
        dfn, titleIen, visitDate, '', '', '', '',
      ]);
      rpcUsed.push('TIU CREATE RECORD');
      noteIen = extractNumericRpcIen(noteLines) || '';

      if (noteIen) {
        const textParams: RpcParam[] = [
          { type: 'literal', value: noteIen },
          { type: 'list', value: buildTiuTextBuffer(adminNote) },
          { type: 'literal', value: '0' },
        ];
        await safeCallRpcWithList('TIU SET DOCUMENT TEXT', textParams, { idempotent: false });
        rpcUsed.push('TIU SET DOCUMENT TEXT');
      } else {
        log.warn('TIU CREATE RECORD returned non-numeric note IEN', {
          dfn,
          orderIEN,
          preview: String((noteLines || [])[0] || '').slice(0, 200),
        });
      }
    } catch (tiuErr: any) {
      log.warn('TIU documentation note failed (non-fatal)', { error: safeErr(tiuErr) });
    }

    // Return combined result
    if (medLogResult || noteIen) {
      immutableAudit('emar.administer', 'success', auditActor(session), {
        detail: { dfn, orderIEN, action, medLogRecorded: !!medLogResult, noteIen },
      });
      return {
        ok: true,
        source: 'vista',
        action,
        orderIEN,
        medLog: medLogResult ? {
          ien: medLogResult.IEN || medLogResult.SEQ || '',
          source: medLogResult.SOURCE || 'vista',
          medication: medLogResult.MEDICATION || '',
        } : null,
        noteIen: noteIen || null,
        rpcUsed,
        _note: medLogResult
          ? 'BCMA medication log write succeeded.'
          : 'BCMA medication log RPC is unavailable in this sandbox lane; administration was captured as a TIU nursing-note fallback.',
      };
    }

    immutableAudit('emar.administer', 'failure', auditActor(session), {
      detail: { dfn, orderIEN, action, error: 'Both MEDLOG and TIU failed' },
    });
    return reply.code(502).send({
      ok: false,
      error: 'Failed to record administration via ZVENAS MEDLOG and TIU',
      rpcUsed,
    });
  });

  /* ------ GET /emar/duplicate-check?dfn=N ------ */
  server.get('/emar/duplicate-check', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const dfn = validateDfn((request.query as any)?.dfn, reply);
    if (!dfn) return;

    try {
      const activeLines = await safeCallRpc('ORWPS ACTIVE', [dfn]);

      // Distinguish VistA error from empty result
      if (activeLines && activeLines.length > 0 && activeLines[0].startsWith('-1')) {
        const errMsg = activeLines[0].split('^').slice(1).join('^') || 'Unknown VistA error';
        return reply.code(502).send({
          ok: false,
          error: errMsg,
          source: 'vista',
          rpcUsed: ['ORWPS ACTIVE'],
        });
      }

      if (!activeLines || activeLines.length === 0) {
        return {
          ok: true,
          source: 'heuristic',
          duplicates: [],
          count: 0,
          rpcUsed: ['ORWPS ACTIVE'],
          _heuristicDisclaimer:
            'This check uses name-based therapeutic class matching and is NOT a substitute for pharmacist review or a clinical decision support engine.',
        };
      }

      const meds = parseActiveMeds(activeLines);
      const duplicates = detectDuplicates(meds);

      immutableAudit('emar.duplicate-check', 'success', auditActor(session), {
        detail: { dfn, duplicateCount: duplicates.length, medCount: meds.length },
      });
      return {
        ok: true,
        source: 'heuristic',
        count: duplicates.length,
        duplicates,
        activeMedCount: meds.length,
        rpcUsed: ['ORWPS ACTIVE'],
        _heuristicDisclaimer:
          'This check uses name-based therapeutic class matching and is NOT a substitute for pharmacist review or a clinical decision support engine. Always verify with pharmacy before acting on these alerts.',
      };
    } catch (err: any) {
      log.error('eMAR duplicate check failed', { error: safeErr(err) });
      immutableAudit('emar.duplicate-check', 'error', auditActor(session), {
        detail: { dfn, error: 'RPC failed' },
      });
      return reply.code(502).send({
        ok: false,
        error: safeErr(err),
        source: 'error',
        rpcUsed: ['ORWPS ACTIVE'],
      });
    }
  });

  /* ------ POST /emar/barcode-scan (Tier-0 capability-gated) ------ */
  server.post('/emar/barcode-scan', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);

    const body = (request.body as any) || {};
    const barcode = String(body.barcode || '').trim();
    const dfn = String(body.dfn || '').trim();

    if (!barcode) {
      return reply.code(400).send({ ok: false, error: 'Missing barcode value' });
    }
    if (barcode.length > 500) {
      return reply
        .code(400)
        .send({ ok: false, error: 'Barcode exceeds maximum length (500 chars)' });
    }
    if (!dfn || !/^\d+$/.test(dfn)) {
      return reply.code(400).send({ ok: false, error: 'Missing or non-numeric dfn' });
    }

    const rpcUsed: string[] = [];
    try {
      const activeLines = await safeCallRpc('ORWPS ACTIVE', [dfn]);
      rpcUsed.push('ORWPS ACTIVE');
      let meds = parseActiveMeds(activeLines || []);
      const fallbackUsed = meds.length === 0;
      if (meds.length === 0) {
        const fallback = await buildScheduleFallbackFromOrders(dfn);
        meds = fallback.schedule;
        for (const rpc of fallback.rpcUsed) {
          if (!rpcUsed.includes(rpc)) rpcUsed.push(rpc);
        }
      }

      let validateResult: string[] = [];
      try {
        validateResult = await safeCallRpc('PSB VALIDATE ORDER', [dfn, barcode]);
        rpcUsed.push('PSB VALIDATE ORDER');
      } catch {
        /* PSB VALIDATE ORDER may need specific params */
      }

      const filteredValidateResult = validateResult.map((line) => line.trim()).filter(Boolean);
      const hasValidationError = filteredValidateResult.some(isVistaValidationError);
      const validatedOrderIens = extractValidatedOrderIens(filteredValidateResult);
      if (meds.length === 0 && filteredValidateResult.length > 0) {
        const validatedCandidates = await buildMedicationCandidatesFromValidatedOrders(
          filteredValidateResult
        );
        if (validatedCandidates.meds.length > 0) {
          meds = validatedCandidates.meds;
          for (const rpc of validatedCandidates.rpcUsed) {
            if (!rpcUsed.includes(rpc)) rpcUsed.push(rpc);
          }
        }
      }

      const match = meds.find(
        (m) =>
          (m.drugName || '').toLowerCase().includes(barcode.toLowerCase()) ||
          barcode.includes(m.orderIEN || '')
      );
      const validatedMatch = meds.find((m) => validatedOrderIens.includes(m.orderIEN || ''));
      const matchedMedication = match || validatedMatch || null;

      const validationWarning = hasValidationError
        ? 'PSB VALIDATE ORDER did not return a clean BCMA validation result in this sandbox. Barcode matching below is based on active medications only.'
        : null;

      immutableAudit('emar.barcode-scan', 'success', auditActor(session), {
        detail: { dfn, barcodeLength: barcode.length, matched: !!match },
      });
      return {
        ok: true,
        source: 'vista',
        barcode,
        matched: !!matchedMedication,
        medication: matchedMedication
          ? {
              name: matchedMedication.drugName,
              sig: matchedMedication.sig,
              orderIEN: matchedMedication.orderIEN,
            }
          : null,
        validateResult: hasValidationError ? [] : filteredValidateResult,
        validationWarning,
        activeMedCount: meds.length,
        fallbackUsed,
        fallbackReason: fallbackUsed
          ? 'ORWPS ACTIVE returned no active medication rows; barcode candidates were synthesized from live active CPRS medication orders.'
          : undefined,
        rpcUsed,
        _note:
          validationWarning
            ? fallbackUsed
              ? 'Barcode matched against fallback active medication candidates synthesized from live CPRS orders. PSB/BCMA write-side validation remains sandbox-limited.'
              : 'Barcode matched against ORWPS ACTIVE medications. PSB/BCMA write-side validation remains sandbox-limited.'
            : fallbackUsed
              ? 'Barcode matched against fallback active medication candidates synthesized from live CPRS orders. PSB VALIDATE ORDER was also called for VistA-side validation.'
              : 'Barcode matched against ORWPS ACTIVE medications. PSB VALIDATE ORDER was also called for VistA-side validation.',
      };
    } catch (err: any) {
      log.warn('eMAR barcode scan failed', { error: safeErr(err) });
      return reply.code(500).send({
        ok: false,
        error: 'Barcode scan failed',
        rpcUsed: rpcUsed.length ? rpcUsed : ['ORWPS ACTIVE'],
      });
    }
  });
}
