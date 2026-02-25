/**
 * Inpatient Operations Routes — Phase 83: Census + Bedboard + ADT + Movement
 *
 * Extends Phase 67 ADT layer with enterprise inpatient views.
 * VistA-first: leverages ORQPT WARDS, ORQPT WARD PATIENTS, ORWPT16 ADMITLST.
 * Where VistA RPCs lack detail (bed assignment, movement history), endpoints
 * return structured integration-pending blockers with exact FileMan targets.
 *
 * Endpoints:
 *   GET  /vista/inpatient/wards                   — Ward list with census counts
 *   GET  /vista/inpatient/ward-census?ward=IEN     — Enriched census for a ward
 *   GET  /vista/inpatient/bedboard?ward=IEN        — Bed-level occupancy grid
 *   GET  /vista/inpatient/patient-movements?dfn=N  — Patient movement timeline
 *   POST /vista/inpatient/admit                    — (integration-pending)
 *   POST /vista/inpatient/transfer                 — (integration-pending)
 *   POST /vista/inpatient/discharge                — (integration-pending)
 *
 * Auth: session-based (/vista/* catch-all in security.ts).
 * RBAC: read endpoints require session; write stubs note role requirements.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../../auth/auth-routes.js";
import { safeCallRpc } from "../../lib/rpc-resilience.js";
import { immutableAudit } from "../../lib/immutable-audit.js";
import { log } from "../../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Audit helper                                                         */
/* ------------------------------------------------------------------ */

function auditActor(request: FastifyRequest): { sub: string; name: string; roles: string[] } {
  const s = request.session;
  return {
    sub: s?.duz || "anonymous",
    name: s?.userName || "unknown",
    roles: s?.role ? [s.role] : [],
  };
}

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface WardSummary {
  ien: string;
  name: string;
  patientCount: number;
}

interface CensusPatient {
  dfn: string;
  name: string;
  admitDate: string;
  ward: string;
  roomBed: string;
}

interface BedSlot {
  ward: string;
  wardIen: string;
  roomBed: string;
  status: "occupied" | "empty";
  patientDfn: string | null;
  patientName: string | null;
  patientInitials: string | null;
  admitDate: string | null;
}

interface MovementEvent {
  date: string;
  type: string;
  fromLocation: string;
  toLocation: string;
  ward: string;
  roomBed: string;
  provider: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Numeric IEN/DFN guard -- filters out MUMPS error text lines. */
const NUMERIC_RE = /^\d+$/;

/** Parse IEN^NAME lines from ORQPT WARDS */
function parseWardList(lines: string[]): Array<{ ien: string; name: string }> {
  const results: Array<{ ien: string; name: string }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split("^");
    const ien = parts[0]?.trim() || "";
    if (!NUMERIC_RE.test(ien)) continue;
    results.push({ ien, name: parts[1]?.trim() || "" });
  }
  return results;
}

/** Parse DFN^NAME from ORQPT WARD PATIENTS */
function parsePatientList(lines: string[]): Array<{ dfn: string; name: string }> {
  const results: Array<{ dfn: string; name: string }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split("^");
    const dfn = parts[0]?.trim() || "";
    if (!NUMERIC_RE.test(dfn)) continue;
    results.push({ dfn, name: parts[1]?.trim() || "" });
  }
  return results;
}

/** Parse ORWPT16 ADMITLST: DFN^NAME^ADMIT_DATE^WARD^ROOM */
function parseAdmissionList(lines: string[]): CensusPatient[] {
  const results: CensusPatient[] = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split("^");
    const dfn = parts[0]?.trim() || "";
    if (!NUMERIC_RE.test(dfn)) continue;
    results.push({
      dfn,
      name: parts[1]?.trim() || "",
      admitDate: parts[2]?.trim() || "",
      ward: parts[3]?.trim() || "",
      roomBed: parts[4]?.trim() || "",
    });
  }
  return results;
}

/** Extract initials from patient name (LAST,FIRST -> FL) */
function getInitials(name: string): string {
  if (!name) return "";
  const parts = name.split(",").map((s) => s.trim());
  const last = parts[0]?.[0] || "";
  const first = parts[1]?.[0] || "";
  return (first + last).toUpperCase();
}

/** Standard integration-pending response */
function pendingFallback(
  reply: FastifyReply,
  rpcName: string,
  err: any,
) {
  const errMsg = err?.message || String(err);
  log.warn(`Inpatient ${rpcName} failed -- returning integration-pending`, {
    err: errMsg,
  });
  return reply.send({
    ok: false,
    source: "vista",
    count: 0,
    results: [],
    rpcUsed: [],
    pendingTargets: [rpcName],
    _integration: "pending",
    _error: errMsg.includes("ECONNREFUSED")
      ? "VistA unavailable"
      : "RPC call failed",
  });
}

/* ------------------------------------------------------------------ */
/* Routes                                                               */
/* ------------------------------------------------------------------ */

export default async function inpatientRoutes(
  server: FastifyInstance,
): Promise<void> {
  /**
   * GET /vista/inpatient/wards
   * Returns ward list with census counts (patients per ward).
   * Uses: ORQPT WARDS + ORQPT WARD PATIENTS (per ward).
   *
   * For large installations, consider caching ward census counts
   * or using a custom ZVE* RPC that returns counts in a single call.
   */
  server.get(
    "/vista/inpatient/wards",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      try {
        const wardLines = await safeCallRpc("ORQPT WARDS", []);
        const wards = parseWardList(wardLines);

        // Build ward summaries with patient counts
        // For each ward, call ORQPT WARD PATIENTS to get the count.
        // This is N+1; a production ZVE* RPC would batch this.
        const summaries: WardSummary[] = [];
        for (const w of wards) {
          let count = 0;
          try {
            const patLines = await safeCallRpc("ORQPT WARD PATIENTS", [w.ien]);
            count = parsePatientList(patLines).length;
          } catch {
            // Ward may have no patients; count stays 0.
          }
          summaries.push({ ien: w.ien, name: w.name, patientCount: count });
        }

        immutableAudit("inpatient.wards", "success", auditActor(request), {
          detail: { wardCount: summaries.length },
        });

        return reply.send({
          ok: true,
          source: "vista",
          count: summaries.length,
          results: summaries,
          rpcUsed: ["ORQPT WARDS", "ORQPT WARD PATIENTS"],
          pendingTargets: [],
          _note:
            "patientCount uses N+1 ward queries; production should use ZVEADT WARDS RPC",
        });
      } catch (err: any) {
        immutableAudit("inpatient.wards", "failure", auditActor(request), {
          detail: { error: err?.message },
        });
        return pendingFallback(reply, "ORQPT WARDS", err);
      }
    },
  );

  /**
   * GET /vista/inpatient/ward-census?ward=IEN
   * Returns enriched patient list for a specific ward.
   * Uses: ORQPT WARD PATIENTS for patient list,
   *       ORWPT16 ADMITLST per patient for admit details.
   */
  server.get(
    "/vista/inpatient/ward-census",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const wardIen = (request.query as any)?.ward;
      if (!wardIen) {
        return reply
          .status(400)
          .send({ ok: false, error: "ward query parameter required" });
      }

      try {
        // Get patient list for ward
        const patientLines = await safeCallRpc("ORQPT WARD PATIENTS", [
          String(wardIen),
        ]);
        const patients = parsePatientList(patientLines);

        // Enrich each patient with admission info
        const census: CensusPatient[] = [];
        for (const pat of patients) {
          let admitDate = "";
          let ward = "";
          let roomBed = "";
          try {
            const admitLines = await safeCallRpc("ORWPT16 ADMITLST", [
              pat.dfn,
            ]);
            const admissions = parseAdmissionList(admitLines);
            // Most recent admission is typically first
            if (admissions.length > 0) {
              admitDate = admissions[0].admitDate;
              ward = admissions[0].ward;
              roomBed = admissions[0].roomBed;
            }
          } catch {
            // Admission details unavailable; patient still appears in census
          }
          census.push({
            dfn: pat.dfn,
            name: pat.name,
            admitDate,
            ward,
            roomBed,
          });
        }

        immutableAudit("inpatient.census", "success", auditActor(request), {
          detail: { wardIen: String(wardIen), patientCount: census.length },
        });

        return reply.send({
          ok: true,
          source: "vista",
          count: census.length,
          results: census,
          rpcUsed: ["ORQPT WARD PATIENTS", "ORWPT16 ADMITLST"],
          pendingTargets: [],
          wardIen: String(wardIen),
        });
      } catch (err: any) {
        immutableAudit("inpatient.census", "failure", auditActor(request), {
          detail: { wardIen: String(wardIen), error: err?.message },
        });
        return pendingFallback(reply, "ORQPT WARD PATIENTS", err);
      }
    },
  );

  /**
   * GET /vista/inpatient/bedboard?ward=IEN
   * Returns bed-level occupancy for a ward.
   *
   * VistA bed data lives in ROOM-BED (405.4) cross-referenced from
   * WARD LOCATION (42). The ORQPT RPCs don't expose bed-level data.
   * This endpoint enriches ORQPT WARD PATIENTS results with admission
   * room/bed from ORWPT16.
   *
   * For true bed management (empty beds, OOS beds), a custom ZVEBED* RPC
   * reading ^DIC(42.4) Room-Bed file would be needed.
   */
  server.get(
    "/vista/inpatient/bedboard",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const wardIen = (request.query as any)?.ward;
      if (!wardIen) {
        return reply
          .status(400)
          .send({ ok: false, error: "ward query parameter required" });
      }

      try {
        // Get patients in ward
        const patientLines = await safeCallRpc("ORQPT WARD PATIENTS", [
          String(wardIen),
        ]);
        const patients = parsePatientList(patientLines);

        // Get ward name from ORQPT WARDS (for display)
        let wardName = `Ward ${wardIen}`;
        try {
          const wardLines = await safeCallRpc("ORQPT WARDS", []);
          const wards = parseWardList(wardLines);
          const found = wards.find((w) => w.ien === String(wardIen));
          if (found) wardName = found.name;
        } catch {
          // Fall back to generic name
        }

        // Build occupied bed slots from admission data
        const beds: BedSlot[] = [];
        for (const pat of patients) {
          let roomBed = "";
          let admitDate = "";
          try {
            const admitLines = await safeCallRpc("ORWPT16 ADMITLST", [
              pat.dfn,
            ]);
            const admissions = parseAdmissionList(admitLines);
            if (admissions.length > 0) {
              roomBed = admissions[0].roomBed || "";
              admitDate = admissions[0].admitDate || "";
            }
          } catch {
            // Bed info unavailable
          }
          beds.push({
            ward: wardName,
            wardIen: String(wardIen),
            roomBed: roomBed || "Unassigned",
            status: "occupied",
            patientDfn: pat.dfn,
            patientName: pat.name,
            patientInitials: getInitials(pat.name),
            admitDate,
          });
        }

        immutableAudit("inpatient.bedboard", "success", auditActor(request), {
          detail: { wardIen: String(wardIen), wardName, bedCount: beds.length },
        });

        return reply.send({
          ok: true,
          source: "vista",
          count: beds.length,
          results: beds,
          wardName,
          wardIen: String(wardIen),
          rpcUsed: ["ORQPT WARD PATIENTS", "ORWPT16 ADMITLST", "ORQPT WARDS"],
          pendingTargets: ["ZVEADT BEDS"],
          _note:
            "Only occupied beds shown. Empty/OOS bed data requires ZVEADT BEDS RPC reading ROOM-BED (405.4) / WARD LOCATION (42).",
        });
      } catch (err: any) {
        immutableAudit("inpatient.bedboard", "failure", auditActor(request), {
          detail: { wardIen: String(wardIen), error: err?.message },
        });
        return pendingFallback(reply, "ORQPT WARD PATIENTS", err);
      }
    },
  );

  /**
   * GET /vista/inpatient/patient-movements?dfn=N
   * Returns movement timeline for a patient.
   *
   * ORWPT16 ADMITLST returns admission episodes but NOT individual
   * movements (transfers between wards/beds). Full movement history
   * lives in PATIENT MOVEMENT (405) file, which requires either:
   *   - DG REGISTRATION MOVEMENT RPC (if available in context), or
   *   - Custom ZVEADTM LIST RPC reading ^DGPM(405,D0,...)
   *
   * This endpoint returns admission episodes from ORWPT16 as partial
   * movement data + a structured pending target for full movement history.
   */
  server.get(
    "/vista/inpatient/patient-movements",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const dfn = (request.query as any)?.dfn;
      if (!dfn) {
        return reply
          .status(400)
          .send({ ok: false, error: "dfn query parameter required" });
      }

      try {
        const admitLines = await safeCallRpc("ORWPT16 ADMITLST", [
          String(dfn),
        ]);
        const admissions = parseAdmissionList(admitLines);

        // Convert admissions to movement events
        const movements: MovementEvent[] = admissions.map((adm) => ({
          date: adm.admitDate,
          type: "ADMISSION",
          fromLocation: "",
          toLocation: adm.ward,
          ward: adm.ward,
          roomBed: adm.roomBed,
          provider: "",
        }));

        immutableAudit("inpatient.movements", "success", auditActor(request), {
          detail: { dfn: String(dfn), movementCount: movements.length },
        });

        return reply.send({
          ok: true,
          source: "vista",
          count: movements.length,
          results: movements,
          dfn: String(dfn),
          rpcUsed: ["ORWPT16 ADMITLST"],
          pendingTargets: ["ZVEADT MVHIST"],
          _note:
            "Only admission events shown. Transfer/discharge movements require ZVEADT MVHIST RPC reading PATIENT MOVEMENT (405).",
          vistaGrounding: {
            vistaFiles: [
              "PATIENT MOVEMENT (405)",
              "PATIENT MOVEMENT TYPE (405.1)",
            ],
            targetRoutines: ["DGPMV", "DGPMU", "ZVEADT"],
            migrationPath:
              "Phase 137B: Install ZVEADT.m and register ZVEADT MVHIST RPC to read ^DGPM(405) movement chain",
            sandboxNote:
              "ORWPT16 ADMITLST returns admission episodes only, not inter-ward transfers or discharges",
          },
        });
      } catch (err: any) {
        immutableAudit("inpatient.movements", "failure", auditActor(request), {
          detail: { dfn: String(dfn), error: err?.message },
        });
        return pendingFallback(reply, "ORWPT16 ADMITLST", err);
      }
    },
  );

  /**
   * POST /vista/inpatient/admit — INTEGRATION PENDING
   * Delegates to Phase 67 /vista/adt/admit. Documented here for
   * inpatient module completeness.
   */
  server.post(
    "/vista/inpatient/admit",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      return reply.status(202).send({
        ok: false,
        status: "integration-pending",
        action: "admit",
        message:
          "Patient admission requires DG ADT package RPCs not exposed in the WorldVistA sandbox OR CPRS GUI CHART context.",
        rpcUsed: [],
        pendingTargets: ["DGPM NEW ADMISSION"],
        vistaGrounding: {
          vistaFiles: [
            "PATIENT MOVEMENT (405)",
            "PATIENT (2)",
            "WARD LOCATION (42)",
          ],
          targetRoutines: ["DGPMV", "DGADM"],
          requiredFields: [
            "patientDfn",
            "wardIen",
            "admitDateTime",
            "admittingDiagnosis",
            "attendingProvider",
            "treatSpecialty",
          ],
          migrationPath:
            "Phase 83B: Wire DGPM NEW ADMISSION with ward/bed selection + DG ADT event triggers",
          sandboxNote:
            "WorldVistA Docker does not expose DG ADT write RPCs in OR CPRS GUI CHART context",
        },
      });
    },
  );

  /**
   * POST /vista/inpatient/transfer — INTEGRATION PENDING
   */
  server.post(
    "/vista/inpatient/transfer",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      return reply.status(202).send({
        ok: false,
        status: "integration-pending",
        action: "transfer",
        message:
          "Patient transfer requires DG ADT write RPCs not exposed in the WorldVistA sandbox.",
        rpcUsed: [],
        pendingTargets: ["DGPM NEW TRANSFER"],
        vistaGrounding: {
          vistaFiles: [
            "PATIENT MOVEMENT (405)",
            "WARD LOCATION (42)",
            "ROOM-BED (405.4)",
          ],
          targetRoutines: ["DGPMV", "DGTRAN"],
          requiredFields: [
            "patientDfn",
            "fromWardIen",
            "toWardIen",
            "transferDateTime",
            "newAttendingProvider",
          ],
          migrationPath:
            "Phase 83B: Wire DGPM NEW TRANSFER with destination ward/bed + attending provider update",
          sandboxNote:
            "WorldVistA Docker does not expose DG ADT write RPCs in OR CPRS GUI CHART context",
        },
      });
    },
  );

  /**
   * POST /vista/inpatient/discharge — INTEGRATION PENDING
   */
  server.post(
    "/vista/inpatient/discharge",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      return reply.status(202).send({
        ok: false,
        status: "integration-pending",
        action: "discharge",
        message:
          "Patient discharge requires DG ADT write RPCs not exposed in the WorldVistA sandbox.",
        rpcUsed: [],
        pendingTargets: ["DGPM NEW DISCHARGE"],
        vistaGrounding: {
          vistaFiles: [
            "PATIENT MOVEMENT (405)",
            "PATIENT (2)",
            "DISPOSITION (405.2)",
          ],
          targetRoutines: ["DGPMV", "DGDIS"],
          requiredFields: [
            "patientDfn",
            "dischargeDateTime",
            "dischargeType",
            "disposition",
            "dischargeDiagnosis",
          ],
          migrationPath:
            "Phase 83B: Wire DGPM NEW DISCHARGE with discharge type + disposition + diagnosis",
          sandboxNote:
            "WorldVistA Docker does not expose DG ADT write RPCs in OR CPRS GUI CHART context",
        },
      });
    },
  );

  log.info("Phase 83+137 inpatient routes registered (7 endpoints, HIPAA audit)");
}
