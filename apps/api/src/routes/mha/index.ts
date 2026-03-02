/**
 * MHA Routes — Phase 535/536: Mental Health Assessment v1 + TIU Writeback
 *
 * Endpoints:
 *   GET  /vista/mha/instruments              — List available MH instruments
 *   GET  /vista/mha/instruments/:id          — Get full instrument definition (FHIR Questionnaire)
 *   GET  /vista/mha/results?dfn=N            — Patient MH results history
 *   POST /vista/mha/administer               — Submit completed instrument + score
 *   POST /vista/mha/administer/:id/file-note — File scored result as TIU note (Phase 536)
 *
 * Auth: session-based (/vista/* catch-all in security.ts).
 * VistA RPCs: YTT/YTQZ namespace + TIU CREATE RECORD / TIU SET DOCUMENT TEXT.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../../auth/auth-routes.js";
import { safeCallRpc } from "../../lib/rpc-resilience.js";
import { log } from "../../lib/logger.js";
import { listInstruments, getInstrument, loadInstruments } from "./instruments.js";
import { scoreInstrument, type MhaAnswer, type MhaScoreResult } from "./scoring.js";
import { generateMhaNote, buildNoteInput } from "./note-generator.js";
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
      const raw = await safeCallRpc("YTQZ RESULTLIST", [dfn]);
      const rawStr = Array.isArray(raw) ? raw.join("\n") : String(raw);
      if (rawStr && rawStr.trim()) {
        vistaResults = parseYtqzResults(rawStr);
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

  /* -------------------------------------------------------------- */
  /* POST /vista/mha/administer/:id/file-note — TIU writeback        */
  /* Phase 536: File scored result as TIU note in VistA               */
  /* -------------------------------------------------------------- */
  server.post("/vista/mha/administer/:id/file-note", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { titleIen, visitLocation, visitDate } = body as {
      titleIen?: string;
      visitLocation?: string;
      visitDate?: string;
    };

    // Lookup administration
    const admin = administrationStore.get(id);
    if (!admin) {
      return reply.code(404).send({ ok: false, error: `Administration not found: ${id}` });
    }

    if (admin.vistaFiled) {
      return reply.code(409).send({
        ok: false,
        error: "Already filed to VistA",
        vistaIen: admin.vistaIen,
      });
    }

    // Get instrument for note generation
    const instrument = getInstrument(admin.instrumentId);
    if (!instrument) {
      return reply.code(500).send({
        ok: false,
        error: `Instrument definition not found: ${admin.instrumentId}`,
      });
    }

    // Generate note text
    const noteInput = buildNoteInput(admin, instrument);
    const noteLines = generateMhaNote(noteInput);

    const duz = (session as any).duz || "unknown";
    const useTitleIen = titleIen || "3"; // default to GENERAL NOTE if not specified

    // Attempt TIU CREATE RECORD
    let docIen: string | null = null;
    let rpcUsed: string[] = [];
    let draftFallback = false;

    try {
      const createResp = await safeCallRpc("TIU CREATE RECORD", [
        admin.dfn,
        useTitleIen,
        duz,
        visitLocation || "",
        visitDate || "",
      ]);

      const firstLine = Array.isArray(createResp) ? createResp[0] : String(createResp);
      docIen = firstLine?.split("^")[0]?.trim() || null;

      if (!docIen || docIen.startsWith("-1") || docIen === "0") {
        draftFallback = true;
        docIen = null;
        log.warn(`MHA: TIU CREATE RECORD returned error: ${firstLine}`);
      } else {
        rpcUsed.push("TIU CREATE RECORD");
      }
    } catch (err: any) {
      draftFallback = true;
      log.warn(`MHA: TIU CREATE RECORD unavailable, using draft fallback: ${err.message}`);
    }

    // If we got a doc IEN, set the text
    if (docIen && !draftFallback) {
      try {
        // Build word-processing LIST parameter
        const textEntries: string[] = [];
        for (let i = 0; i < noteLines.length; i++) {
          textEntries.push(noteLines[i]);
        }
        await safeCallRpc("TIU SET DOCUMENT TEXT", [docIen, ...textEntries]);
        rpcUsed.push("TIU SET DOCUMENT TEXT");

        // Mark as filed
        admin.vistaFiled = true;
        admin.vistaIen = docIen;

        log.info(`MHA: Filed TIU note IEN=${docIen} for instrument ${admin.instrumentId}`);
      } catch (err: any) {
        draftFallback = true;
        log.warn(`MHA: TIU SET DOCUMENT TEXT failed: ${err.message}`);
      }
    }

    if (draftFallback) {
      return reply.code(200).send({
        ok: true,
        status: "draft",
        source: "local-draft",
        administrationId: admin.id,
        instrumentId: admin.instrumentId,
        noteText: noteLines.join("\n"),
        vistaFiled: false,
        rpcUsed,
        pendingTargets: ["TIU CREATE RECORD", "TIU SET DOCUMENT TEXT"],
        _note: "VistA TIU RPCs unavailable -- note text returned as draft for manual filing.",
      });
    }

    return reply.code(200).send({
      ok: true,
      status: "filed",
      source: "vista",
      administrationId: admin.id,
      instrumentId: admin.instrumentId,
      vistaFiled: true,
      vistaIen: docIen,
      rpcUsed,
      pendingTargets: [],
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
