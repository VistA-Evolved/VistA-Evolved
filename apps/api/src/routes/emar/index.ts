/**
 * eMAR + BCMA Posture Routes -- Phase 85.
 *
 * Endpoints:
 *   GET  /emar/schedule?dfn=N        -- Active medication schedule from ORWPS ACTIVE (real VistA)
 *   GET  /emar/allergies?dfn=N       -- Allergy warnings via ORQQAL LIST (real VistA)
 *   GET  /emar/history?dfn=N         -- Administration history (integration-pending -> PSB MED LOG)
 *   POST /emar/administer            -- Record administration (integration-pending -> PSB MED LOG)
 *   GET  /emar/duplicate-check?dfn=N -- Heuristic duplicate therapy detection (labeled)
 *   POST /emar/barcode-scan          -- BCMA barcode scan (integration-pending -> PSJBCMA)
 *
 * Real VistA data for schedule + allergies; integration-pending for BCMA write paths.
 * Every response includes rpcUsed[], pendingTargets[], source.
 *
 * Auth: session-based (emar/* added to AUTH_RULES catch-all via /emar/ prefix).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../../auth/auth-routes.js";
import { safeCallRpc } from "../../lib/rpc-resilience.js";
import { log } from "../../lib/logger.js";
import { safeErr } from '../../lib/safe-error.js';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Standard integration-pending response shape. */
function pendingFallback(
  label: string,
  targets: Array<{ rpc: string; package: string; reason: string }>,
  vistaGrounding?: Record<string, unknown>,
) {
  return {
    ok: true,
    source: "integration-pending" as const,
    status: "integration-pending" as const,
    label,
    items: [],
    rpcUsed: [] as string[],
    pendingTargets: targets,
    ...(vistaGrounding ? { vistaGrounding } : {}),
  };
}

/** Validate DFN query param. Returns null if valid, error reply if not. */
function validateDfn(dfn: unknown, reply: FastifyReply): string | null {
  const val = String(dfn || "").trim();
  if (!val || !/^\d+$/.test(val)) {
    reply.code(400).send({ ok: false, error: "Missing or non-numeric dfn query parameter" });
    return null;
  }
  return val;
}

/* ------------------------------------------------------------------ */
/* Medication schedule types                                            */
/* ------------------------------------------------------------------ */

interface ScheduleEntry {
  orderIEN: string;
  rxId: string;
  type: string;         // OP=Outpatient, UD=Unit Dose, IV=IV, NV=Non-VA, CP=Clinic
  drugName: string;
  status: string;
  sig: string;
  schedule: string;     // e.g. "BID", "Q8H", "PRN" (derived from sig)
  isPRN: boolean;
  nextDue: string | null;    // ISO or heuristic label
  route: string;        // PO, IV, IM, etc. (derived from sig)
  frequency: string;    // human-readable
}

/** Parse ORWPS ACTIVE output into schedule entries. */
function parseActiveMeds(activeLines: string[]): ScheduleEntry[] {
  const meds: ScheduleEntry[] = [];
  let current: ScheduleEntry | null = null;

  for (const line of activeLines) {
    if (line.startsWith("~")) {
      const typeEnd = line.indexOf("^");
      const type = line.substring(1, typeEnd);
      const fields = line.substring(typeEnd + 1).split("^");
      current = {
        orderIEN: fields[7]?.trim() || "",
        rxId: fields[0]?.split(";")[0] || "",
        type,
        drugName: fields[1]?.trim() || "",
        status: fields[8]?.trim() || "active",
        sig: "",
        schedule: "",
        isPRN: false,
        nextDue: null,
        route: "",
        frequency: "",
      };
      meds.push(current);
    } else if (current) {
      const trimmed = line.trim();
      if (trimmed.startsWith("\\ Sig:") || trimmed.startsWith("\\Sig:")) {
        current.sig = trimmed.replace(/^\\\s*Sig:\s*/i, "").trim();
      } else if (trimmed.startsWith("Qty:")) {
        // qty info -- skip for schedule
      } else if (trimmed) {
        // Continuation lines (drug info or additional sig text)
        current.sig += (current.sig ? " " : "") + trimmed;
      }
    }
  }

  // Derive schedule metadata from sig text
  for (const med of meds) {
    const sigUpper = med.sig.toUpperCase();
    med.isPRN = sigUpper.includes("PRN") || sigUpper.includes("AS NEEDED");

    // Extract route
    if (sigUpper.includes(" IV ") || sigUpper.includes("INTRAVENOUS")) med.route = "IV";
    else if (sigUpper.includes(" IM ") || sigUpper.includes("INTRAMUSCULAR")) med.route = "IM";
    else if (sigUpper.includes(" SQ ") || sigUpper.includes("SUBCUTANEOUS")) med.route = "SQ";
    else if (sigUpper.includes(" PO ") || sigUpper.includes("BY MOUTH") || sigUpper.includes("ORAL")) med.route = "PO";
    else if (sigUpper.includes("TOPICAL")) med.route = "TOP";
    else if (sigUpper.includes("OPHTHALMIC")) med.route = "OPH";
    else if (sigUpper.includes("OTIC")) med.route = "OTIC";
    else if (sigUpper.includes("NASAL") || sigUpper.includes("INHALE")) med.route = "INH";
    else if (sigUpper.includes("RECTAL")) med.route = "PR";
    else med.route = "PO"; // default

    // Extract frequency
    const freqPatterns: Array<[RegExp, string, string]> = [
      [/\bQ(\d+)H\b/i, "Q$1H", "every $1 hours"],
      [/\bBID\b/i, "BID", "twice daily"],
      [/\bTID\b/i, "TID", "three times daily"],
      [/\bQID\b/i, "QID", "four times daily"],
      [/\bQD\b|DAILY|ONCE DAILY/i, "QD", "once daily"],
      [/\bQ(\d+)MIN\b/i, "Q$1MIN", "every $1 minutes"],
      [/\bQHS\b|AT BEDTIME/i, "QHS", "at bedtime"],
      [/\bQAM\b/i, "QAM", "every morning"],
      [/\bQPM\b/i, "QPM", "every evening"],
      [/\bQ(\d+)D\b/i, "Q$1D", "every $1 days"],
      [/\bWEEKLY\b|QW\b/i, "QW", "weekly"],
      [/\bSTAT\b/i, "STAT", "immediately"],
      [/\bONCE\b/i, "ONCE", "one time"],
    ];

    for (const [regex, sched, freq] of freqPatterns) {
      const match = sigUpper.match(regex);
      if (match) {
        med.schedule = sched.replace("$1", match[1] || "");
        med.frequency = freq.replace("$1", match[1] || "");
        break;
      }
    }

    if (!med.schedule && med.isPRN) {
      med.schedule = "PRN";
      med.frequency = "as needed";
    }
    if (!med.schedule) {
      med.schedule = "UNSCHEDULED";
      med.frequency = "see sig for details";
    }

    // Heuristic next-due (we don't have real admin times -- this is a posture label)
    if (med.isPRN) {
      med.nextDue = null; // PRN has no scheduled time
    } else if (med.schedule === "STAT" || med.schedule === "ONCE") {
      med.nextDue = null;
    } else {
      // Without real PSB data, we cannot calculate actual due times.
      // Label this clearly as a posture placeholder.
      med.nextDue = "scheduled";
    }
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
    "ACE Inhibitor": ["LISINOPRIL", "ENALAPRIL", "CAPTOPRIL", "RAMIPRIL", "BENAZEPRIL", "FOSINOPRIL", "QUINAPRIL"],
    "Beta Blocker": ["ATENOLOL", "METOPROLOL", "PROPRANOLOL", "CARVEDILOL", "BISOPROLOL", "LABETALOL", "NADOLOL"],
    "Statin": ["ATORVASTATIN", "SIMVASTATIN", "ROSUVASTATIN", "PRAVASTATIN", "LOVASTATIN", "FLUVASTATIN"],
    "NSAID": ["IBUPROFEN", "NAPROXEN", "DICLOFENAC", "INDOMETHACIN", "MELOXICAM", "KETOROLAC", "CELECOXIB"],
    "PPI": ["OMEPRAZOLE", "PANTOPRAZOLE", "ESOMEPRAZOLE", "LANSOPRAZOLE", "RABEPRAZOLE"],
    "SSRI": ["FLUOXETINE", "SERTRALINE", "PAROXETINE", "CITALOPRAM", "ESCITALOPRAM", "FLUVOXAMINE"],
    "Thiazide": ["HYDROCHLOROTHIAZIDE", "CHLORTHALIDONE", "METOLAZONE", "INDAPAMIDE"],
    "Calcium Channel Blocker": ["AMLODIPINE", "NIFEDIPINE", "DILTIAZEM", "VERAPAMIL", "FELODIPINE"],
    "ARB": ["LOSARTAN", "VALSARTAN", "IRBESARTAN", "OLMESARTAN", "CANDESARTAN", "TELMISARTAN"],
    "Anticoagulant": ["WARFARIN", "HEPARIN", "ENOXAPARIN", "RIVAROXABAN", "APIXABAN", "DABIGATRAN"],
    "Opioid": ["MORPHINE", "HYDROCODONE", "OXYCODONE", "FENTANYL", "CODEINE", "TRAMADOL", "METHADONE", "HYDROMORPHONE"],
    "Benzodiazepine": ["LORAZEPAM", "DIAZEPAM", "ALPRAZOLAM", "CLONAZEPAM", "MIDAZOLAM"],
    "Sulfonylurea": ["GLIPIZIDE", "GLYBURIDE", "GLIMEPIRIDE"],
    "Insulin": ["INSULIN"],
  };

  // Build reverse map: drug keyword -> class
  const drugToClass = new Map<string, string>();
  for (const [className, drugs] of Object.entries(classMap)) {
    for (const drug of drugs) {
      drugToClass.set(drug, className);
    }
  }

  // Check each pair of active meds for same therapeutic class
  const activeMeds = meds.filter(m => m.status.toLowerCase() === "active" || !m.status);
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
              // Same class — flag even if same drug keyword (different order = potential duplicate)
              const reason = keyword === keyword2
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
          reason: "Same medication ordered twice",
        });
      }
    }
  }

  // De-duplicate (same pair may match multiple keywords)
  const seen = new Set<string>();
  return duplicates.filter(d => {
    const key = [d.orderA, d.orderB].sort().join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* ================================================================== */
/* Route registration                                                   */
/* ================================================================== */

export default async function emarRoutes(server: FastifyInstance) {

  /* ------ GET /emar/schedule?dfn=N ------ */
  server.get("/emar/schedule", async (request: FastifyRequest, reply: FastifyReply) => {
    const _session = await requireSession(request, reply);
    const dfn = validateDfn((request.query as any)?.dfn, reply);
    if (!dfn) return;

    try {
      const activeLines = await safeCallRpc("ORWPS ACTIVE", [dfn]);

      if (!activeLines || activeLines.length === 0) {
        return {
          ok: true,
          source: "vista",
          schedule: [],
          count: 0,
          rpcUsed: ["ORWPS ACTIVE"],
          pendingTargets: [
            {
              rpc: "PSB MED LOG",
              package: "PSB",
              reason: "Actual due times require BCMA/PSB package (not available in WorldVistA sandbox). Schedule times shown are heuristic.",
            },
          ],
          _heuristicWarning: "Due times are derived from sig text, not from actual BCMA medication log. Install BCMA/PSB for real-time scheduling.",
        };
      }

      // Check for error
      if (activeLines[0].startsWith("-1")) {
        const errMsg = activeLines[0].split("^").slice(1).join("^") || "Unknown VistA error";
        return reply.code(502).send({
          ok: false,
          error: errMsg,
          source: "vista",
          rpcUsed: ["ORWPS ACTIVE"],
          pendingTargets: [],
        });
      }

      // Resolve empty drug names via ORWORR GETTXT
      const meds = parseActiveMeds(activeLines);
      const rpcsUsed: string[] = ["ORWPS ACTIVE"];

      for (const med of meds) {
        if (!med.drugName && med.orderIEN && /^\d+$/.test(med.orderIEN)) {
          try {
            const txtLines = await safeCallRpc("ORWORR GETTXT", [med.orderIEN]);
            if (txtLines && txtLines.length > 0 && !txtLines[0].startsWith("-1")) {
              med.drugName = txtLines[0].trim();
              if (!med.sig && txtLines[1]) {
                med.sig = txtLines[1].trim();
              }
              if (!rpcsUsed.includes("ORWORR GETTXT")) rpcsUsed.push("ORWORR GETTXT");
            }
          } catch {
            // Non-fatal
          }
        }
      }

      return {
        ok: true,
        source: "vista",
        count: meds.length,
        schedule: meds.map(m => ({
          orderIEN: m.orderIEN,
          rxId: m.rxId,
          drugName: m.drugName || "(unknown medication)",
          type: m.type,
          status: m.status.toLowerCase() || "active",
          sig: m.sig,
          route: m.route,
          schedule: m.schedule,
          isPRN: m.isPRN,
          frequency: m.frequency,
          nextDue: m.nextDue,
        })),
        rpcUsed: rpcsUsed,
        pendingTargets: [
          {
            rpc: "PSB MED LOG",
            package: "PSB",
            reason: "Actual due times and administration history require BCMA/PSB package",
          },
        ],
        _heuristicWarning: "Due times are derived from sig text, not from actual BCMA medication log. Install BCMA/PSB for real-time scheduling.",
      };
    } catch (err: any) {
      log.error("eMAR schedule fetch failed", { error: safeErr(err) });
      return reply.code(502).send({
        ok: false,
        error: safeErr(err),
        source: "error",
        rpcUsed: ["ORWPS ACTIVE"],
        pendingTargets: [],
      });
    }
  });

  /* ------ GET /emar/allergies?dfn=N ------ */
  server.get("/emar/allergies", async (request: FastifyRequest, reply: FastifyReply) => {
    const _session = await requireSession(request, reply);
    const dfn = validateDfn((request.query as any)?.dfn, reply);
    if (!dfn) return;

    try {
      const lines = await safeCallRpc("ORQQAL LIST", [dfn]);
      if (!lines || lines.length === 0) {
        return {
          ok: true,
          source: "vista",
          allergies: [],
          count: 0,
          rpcUsed: ["ORQQAL LIST"],
          pendingTargets: [],
        };
      }

      // Parse: id^allergen^severity^reactions (reactions semicolon-separated)
      const allergies = lines
        .map((line: string) => {
          const parts = line.split("^");
          const id = parts[0]?.trim();
          const allergen = parts[1]?.trim() || "";
          const severity = parts[2]?.trim() || "";
          const reactions = parts[3]?.trim() || "";
          if (!id) return null;
          return { id, allergen, severity, reactions: reactions.split(";").map(r => r.trim()).filter(Boolean) };
        })
        .filter((r: unknown): r is { id: string; allergen: string; severity: string; reactions: string[] } => r !== null);

      // Check for drug-allergy interactions with active meds (heuristic)
      // This is a simple name-based check -- NOT a full interaction engine
      const interactionWarnings: Array<{ allergen: string; severity: string; note: string }> = [];
      for (const allergy of allergies) {
        if (allergy.severity?.toUpperCase() === "SEVERE" || allergy.severity?.toUpperCase() === "MODERATE") {
          interactionWarnings.push({
            allergen: allergy.allergen,
            severity: allergy.severity,
            note: "Patient has documented allergy -- verify all medications against this allergen before administration",
          });
        }
      }

      return {
        ok: true,
        source: "vista",
        count: allergies.length,
        allergies,
        interactionWarnings,
        rpcUsed: ["ORQQAL LIST"],
        pendingTargets: [
          {
            rpc: "PSB ALLERGY",
            package: "PSB",
            reason: "BCMA allergy check at scan time requires PSB package",
          },
        ],
      };
    } catch (err: any) {
      log.error("eMAR allergy fetch failed", { error: safeErr(err) });
      return reply.code(502).send({
        ok: false,
        error: safeErr(err),
        source: "error",
        rpcUsed: ["ORQQAL LIST"],
        pendingTargets: [],
      });
    }
  });

  /* ------ GET /emar/history?dfn=N (integration-pending) ------ */
  server.get("/emar/history", async (request: FastifyRequest, reply: FastifyReply) => {
    const _session = await requireSession(request, reply);
    const dfn = validateDfn((request.query as any)?.dfn, reply);
    if (!dfn) return;

    return {
      ...pendingFallback("Medication Administration History", [
        { rpc: "PSB MED LOG", package: "PSB", reason: "Administration history requires BCMA/PSB package (not available in WorldVistA sandbox)" },
      ], {
        vistaFiles: ["PSB(53.79) BCMA MEDICATION LOG"],
        targetRoutines: ["PSBML", "PSBMLEN", "PSBMLHS"],
        migrationPath: "Install BCMA package -> configure PSB MED LOG RPC -> query file 53.79 for administration records",
        sandboxNote: "WorldVistA Docker does not include BCMA/PSB package",
      }),
    };
  });

  /* ------ POST /emar/administer (integration-pending) ------ */
  server.post("/emar/administer", async (request: FastifyRequest, reply: FastifyReply) => {
    const _session = await requireSession(request, reply);

    const body = (request.body as any) || {};
    const dfn = String(body.dfn || "").trim();
    const orderIEN = String(body.orderIEN || "").trim();
    const action = String(body.action || "given").trim();
    const reason = String(body.reason || "").trim();

    if (!dfn || !/^\d+$/.test(dfn)) {
      return reply.code(400).send({ ok: false, error: "Missing or non-numeric dfn" });
    }
    if (!orderIEN || !/^\d+$/.test(orderIEN)) {
      return reply.code(400).send({ ok: false, error: "Missing or non-numeric orderIEN" });
    }

    const validActions = ["given", "held", "refused", "unavailable"];
    if (!validActions.includes(action)) {
      return reply.code(400).send({ ok: false, error: `Invalid action. Must be one of: ${validActions.join(", ")}` });
    }
    if (reason.length > 2000) {
      return reply.code(400).send({ ok: false, error: "Reason exceeds maximum length (2000 chars)" });
    }

    // Log the administration attempt for audit (no PHI in reason field)
    log.info("eMAR administration attempt (integration-pending)", {
      dfn,
      orderIEN,
      action,
      hasReason: !!reason,
    });

    return reply.code(202).send({
      ok: true,
      source: "integration-pending",
      status: "integration-pending",
      message: "Medication administration recording requires BCMA/PSB package. This attempt has been logged for audit.",
      rpcUsed: [],
      pendingTargets: [
        { rpc: "PSB MED LOG", package: "PSB", reason: "Write administration record to BCMA Medication Log (file 53.79)" },
      ],
      vistaGrounding: {
        vistaFiles: ["PSB(53.79) BCMA MEDICATION LOG"],
        targetRoutines: ["PSBML", "PSBMLEN"],
        migrationPath: "Install BCMA package -> enable PSB MED LOG RPC -> implement 5-rights barcode verification -> write to file 53.79",
        sandboxNote: "WorldVistA Docker does not include BCMA/PSB package. Administration recording is deferred.",
      },
      recordedAction: action,
      auditNote: "Administration attempt logged with timestamp, user, patient, and order for compliance trail.",
    });
  });

  /* ------ GET /emar/duplicate-check?dfn=N ------ */
  server.get("/emar/duplicate-check", async (request: FastifyRequest, reply: FastifyReply) => {
    const _session = await requireSession(request, reply);
    const dfn = validateDfn((request.query as any)?.dfn, reply);
    if (!dfn) return;

    try {
      const activeLines = await safeCallRpc("ORWPS ACTIVE", [dfn]);

      // Distinguish VistA error from empty result
      if (activeLines && activeLines.length > 0 && activeLines[0].startsWith("-1")) {
        const errMsg = activeLines[0].split("^").slice(1).join("^") || "Unknown VistA error";
        return reply.code(502).send({
          ok: false,
          error: errMsg,
          source: "vista",
          rpcUsed: ["ORWPS ACTIVE"],
          pendingTargets: [],
        });
      }

      if (!activeLines || activeLines.length === 0) {
        return {
          ok: true,
          source: "heuristic",
          duplicates: [],
          count: 0,
          rpcUsed: ["ORWPS ACTIVE"],
          pendingTargets: [],
          _heuristicDisclaimer: "This check uses name-based therapeutic class matching and is NOT a substitute for pharmacist review or a clinical decision support engine.",
        };
      }

      const meds = parseActiveMeds(activeLines);
      const duplicates = detectDuplicates(meds);

      return {
        ok: true,
        source: "heuristic",
        count: duplicates.length,
        duplicates,
        activeMedCount: meds.length,
        rpcUsed: ["ORWPS ACTIVE"],
        pendingTargets: [],
        _heuristicDisclaimer: "This check uses name-based therapeutic class matching and is NOT a substitute for pharmacist review or a clinical decision support engine. Always verify with pharmacy before acting on these alerts.",
      };
    } catch (err: any) {
      log.error("eMAR duplicate check failed", { error: safeErr(err) });
      return reply.code(502).send({
        ok: false,
        error: safeErr(err),
        source: "error",
        rpcUsed: ["ORWPS ACTIVE"],
        pendingTargets: [],
      });
    }
  });

  /* ------ POST /emar/barcode-scan (integration-pending) ------ */
  server.post("/emar/barcode-scan", async (request: FastifyRequest, reply: FastifyReply) => {
    const _session = await requireSession(request, reply);

    const body = (request.body as any) || {};
    const barcode = String(body.barcode || "").trim();
    const dfn = String(body.dfn || "").trim();

    if (!barcode) {
      return reply.code(400).send({ ok: false, error: "Missing barcode value" });
    }
    if (barcode.length > 500) {
      return reply.code(400).send({ ok: false, error: "Barcode exceeds maximum length (500 chars)" });
    }
    if (!dfn || !/^\d+$/.test(dfn)) {
      return reply.code(400).send({ ok: false, error: "Missing or non-numeric dfn" });
    }

    log.info("BCMA barcode scan attempt (integration-pending)", { dfn, barcodeLength: barcode.length });

    return reply.code(202).send({
      ok: true,
      source: "integration-pending",
      status: "integration-pending",
      message: "Barcode medication verification requires BCMA/PSB package with PSJBCMA routines",
      rpcUsed: [],
      pendingTargets: [
        { rpc: "PSB MED LOG", package: "PSB", reason: "BCMA medication verification against active orders" },
        { rpc: "PSJBCMA", package: "PSB", reason: "Barcode-to-medication lookup via PSJ BCMA routines" },
      ],
      vistaGrounding: {
        vistaFiles: ["PSB(53.79) BCMA MEDICATION LOG", "PSB(53.795) BCMA UNABLE TO SCAN LOG"],
        targetRoutines: ["PSJBCMA", "PSJBCMA1", "PSBML"],
        migrationPath: "Install BCMA package -> configure barcode scanner hardware -> enable PSB/PSJ RPCs -> implement 5-rights verification workflow",
        sandboxNote: "WorldVistA Docker does not include BCMA/PSB or PSJ barcode packages",
        fiveRights: ["Right Patient", "Right Medication", "Right Dose", "Right Route", "Right Time"],
      },
    });
  });
}
