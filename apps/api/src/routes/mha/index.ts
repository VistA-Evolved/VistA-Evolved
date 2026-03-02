/**
 * MHA Routes — Phase 535: Mental Health Assessment v1
 *
 * Endpoints:
 *   GET  /vista/mha/instruments         — List available MH instruments
 *   GET  /vista/mha/instruments/:id     — Get full instrument definition (FHIR Questionnaire)
 *   GET  /vista/mha/results?dfn=N       — Patient MH results history
 *   POST /vista/mha/administer          — Submit completed instrument + score
 *
 * Auth: session-based (/vista/* catch-all in security.ts).
 * VistA RPCs: YTT/YTQZ namespace (read-only in v1; write-back in Phase 536).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../../auth/auth-routes.js";
import { safeCallRpc } from "../../lib/rpc-resilience.js";
import { log } from "../../lib/logger.js";
import { safeErr } from "../../lib/safe-error.js";
import { listInstruments, getInstrument, loadInstruments } from "./instruments.js";
import { scoreInstrument, type MhaAnswer, type MhaScoreResult } from "./scoring.js";
import { randomUUID } from "node:crypto";

/* ------------------------------------------------------------------ */
/* In-memory result store (Phase 536 = VistA TIU write-back)           */
/* ------------------------------------------------------------------ */

interface MhaAdministration {
  id: string;
  instrumentId: string;
  dfn: string;
  duz: string;
  answers: MhaAnswer[];
  score: MhaScoreResult;
  administeredAt: string;
  vistaFiled: boolean;
  vistaIen?: string;
}

const administrationStore = new Map<string, MhaAdministration>();

// Per-patient index for history lookups
const patientIndex = new Map<string, string[]>(); // dfn -> administration ids

/* ------------------------------------------------------------------ */
/* Route plugin                                                         */
/* ------------------------------------------------------------------ */

export default async function mhaRoutes(server: FastifyInstance): Promise<void> {
  // Load instruments on registration
  loadInstruments();

  /* -------------------------------------------------------------- */
  /* GET /vista/mha/instruments — list available instruments          */
  /* -------------------------------------------------------------- */
  server.get("/vista/mha/instruments", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const instruments = listInstruments();

    return reply.send({
      ok: true,
      source: "ve-instrument-catalog",
      count: instruments.length,
      instruments,
      rpcUsed: [],
      pendingTargets: ["YTQZ LISTTESTS"],
      _note: "Instruments loaded from FHIR Questionnaire definitions. VistA YTQZ LISTTESTS integration pending.",
    });
  });

  /* -------------------------------------------------------------- */
  /* GET /vista/mha/instruments/:id — get single instrument           */
  /* -------------------------------------------------------------- */
  server.get("/vista/mha/instruments/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const instrument = getInstrument(id);

    if (!instrument) {
      return reply.code(404).send({
        ok: false,
        error: `Instrument not found: ${id}`,
      });
    }

    return reply.send({
      ok: true,
      source: "ve-instrument-catalog",
      instrument,
      rpcUsed: [],
      pendingTargets: ["YTT GET INSTRUMENT"],
      _note: "Instrument definition from local FHIR Questionnaire. VistA YTT GET INSTRUMENT integration pending.",
    });
  });

  /* -------------------------------------------------------------- */
  /* GET /vista/mha/results?dfn=N — patient MH results history        */
  /* -------------------------------------------------------------- */
  server.get("/vista/mha/results", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const { dfn } = request.query as { dfn?: string };
    if (!dfn) {
      return reply.code(400).send({ ok: false, error: "Missing dfn query parameter" });
    }

    // Try VistA RPC first (YTQZ RESULTLIST)
    let vistaResults: any[] = [];
    let rpcUsed: string[] = [];
    let vistaAvailable = false;

    try {
      const raw = await safeCallRpc("YTQZ RESULTLIST", dfn);
      if (raw && typeof raw === "string" && raw.trim()) {
        vistaResults = parseYtqzResults(raw);
        rpcUsed.push("YTQZ RESULTLIST");
        vistaAvailable = true;
      }
    } catch {
      // RPC not available in sandbox — expected
    }

    // Local results
    const localIds = patientIndex.get(dfn) || [];
    const localResults = localIds
      .map((id) => administrationStore.get(id))
      .filter(Boolean)
      .map((a) => ({
        id: a!.id,
        instrumentId: a!.instrumentId,
        totalScore: a!.score.totalScore,
        maxScore: a!.score.maxScore,
        severity: a!.score.severity,
        interpretation: a!.score.interpretation,
        redFlag: a!.score.redFlag,
        administeredAt: a!.administeredAt,
        vistaFiled: a!.vistaFiled,
      }));

    return reply.send({
      ok: true,
      source: vistaAvailable ? "vista+local" : "local",
      dfn,
      vistaResults,
      localResults,
      count: vistaResults.length + localResults.length,
      rpcUsed,
      pendingTargets: vistaAvailable ? [] : ["YTQZ RESULTLIST", "YTQZ DETAILLIST"],
    });
  });

  /* -------------------------------------------------------------- */
  /* POST /vista/mha/administer — submit completed instrument         */
  /* -------------------------------------------------------------- */
  server.post("/vista/mha/administer", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const body = (request.body as any) || {};
    const { instrumentId, dfn, answers } = body as {
      instrumentId?: string;
      dfn?: string;
      answers?: MhaAnswer[];
    };

    if (!instrumentId || !dfn || !answers || !Array.isArray(answers)) {
      return reply.code(400).send({
        ok: false,
        error: "Required: instrumentId, dfn, answers[]",
      });
    }

    // Validate instrument exists
    const instrument = getInstrument(instrumentId);
    if (!instrument) {
      return reply.code(404).send({
        ok: false,
        error: `Instrument not found: ${instrumentId}`,
      });
    }

    // Score
    const score = scoreInstrument(instrumentId, answers);
    if (!score) {
      return reply.code(500).send({
        ok: false,
        error: `Scoring rules not found for: ${instrumentId}`,
      });
    }

    // Store locally
    const administration: MhaAdministration = {
      id: randomUUID(),
      instrumentId,
      dfn,
      duz: (session as any).duz || "unknown",
      answers,
      score,
      administeredAt: new Date().toISOString(),
      vistaFiled: false,
    };

    administrationStore.set(administration.id, administration);
    const existing = patientIndex.get(dfn) || [];
    existing.push(administration.id);
    patientIndex.set(dfn, existing);

    log.info(`MHA: Administered ${instrumentId} for patient, score=${score.totalScore}/${score.maxScore}, severity=${score.severity}${score.redFlag ? " RED FLAG" : ""}`);

    return reply.code(201).send({
      ok: true,
      source: "local",
      administration: {
        id: administration.id,
        instrumentId: administration.instrumentId,
        score: administration.score,
        administeredAt: administration.administeredAt,
        vistaFiled: administration.vistaFiled,
      },
      rpcUsed: [],
      pendingTargets: ["YTT SAVE RESULTS", "TIU CREATE RECORD"],
      _note: "Stored locally. VistA write-back via TIU CREATE RECORD planned for Phase 536.",
    });
  });
}

/* ------------------------------------------------------------------ */
/* VistA response parsers                                               */
/* ------------------------------------------------------------------ */

/**
 * Parse YTQZ RESULTLIST response.
 * Format: IEN^INSTRUMENT_NAME^DATE^SCORE^PROVIDER
 */
function parseYtqzResults(raw: string): Array<{
  ien: string;
  instrumentName: string;
  date: string;
  score: string;
  provider: string;
}> {
  const results: Array<{
    ien: string;
    instrumentName: string;
    date: string;
    score: string;
    provider: string;
  }> = [];
  const lines = raw.split("\n").filter((l) => l.trim());
  for (const line of lines) {
    const parts = line.split("^");
    const ien = parts[0]?.trim() || "";
    if (!ien) continue;
    results.push({
      ien,
      instrumentName: parts[1]?.trim() || "",
      date: parts[2]?.trim() || "",
      score: parts[3]?.trim() || "",
      provider: parts[4]?.trim() || "",
    });
  }
  return results;
}
