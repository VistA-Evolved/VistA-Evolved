import Fastify from "fastify";
import { probeConnect } from "./vista/rpcBroker";
import { validateCredentials } from "./vista/config";
import { connect, disconnect, callRpc, callRpcWithList, getDuz } from "./vista/rpcBrokerClient";

const server = Fastify();

server.get("/health", async () => ({ ok: true }));

// Phase 3 connectivity endpoint remains available (retain behavior)
server.get("/vista/ping", async () => {
  try {
    await probeConnect();
    return { ok: true, vista: "reachable", port: Number(process.env.VISTA_PORT || 9430) };
  } catch (err: any) {
    return { ok: false, vista: "unreachable", error: err.message, port: Number(process.env.VISTA_PORT || 9430) };
  }
});

// Phase 4B: Patient search via ORWPT LIST ALL RPC
server.get("/vista/patient-search", async (request) => {
  const q = (request.query as any)?.q;
  if (!q || typeof q !== "string" || q.trim().length < 2) {
    return { ok: false, error: "Query too short", hint: "Use ?q=SMI (minimum 2 characters)" };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  const RPC_NAME = "ORWPT LIST ALL";

  try {
    await connect();

    // ORWPT LIST ALL params: (FROM, DIR)
    //   FROM = starting search string (case-insensitive)
    //   DIR  = "1" for forward alphabetical
    const lines = await callRpc(RPC_NAME, [q.trim().toUpperCase(), "1"]);

    // Response lines: "DFN^NAME^^^^NAME" — parse DFN and first NAME field
    const results = lines
      .map((line) => {
        const parts = line.split("^");
        const dfn = parts[0]?.trim();
        const name = parts[1]?.trim();
        if (dfn && name) {
          return { dfn, name };
        }
        return null;
      })
      .filter((r) => r !== null);

    disconnect();

    return { ok: true, count: results.length, results, rpcUsed: RPC_NAME };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 5B: Patient demographics via ORWPT SELECT RPC
server.get("/vista/patient-demographics", async (request) => {
  const dfn = (request.query as any)?.dfn;
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn", hint: "Use ?dfn=1" };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  const RPC_NAME = "ORWPT SELECT";

  try {
    await connect();
    const lines = await callRpc(RPC_NAME, [String(dfn)]);
    disconnect();

    const raw = lines[0] || "";
    const parts = raw.split("^");

    // ORWPT SELECT returns "-1" as first field when DFN is unknown
    if (parts[0] === "-1" || !parts[0]) {
      const reason = parts.slice(5).join(" ").trim() || "Patient not found";
      return { ok: false, error: reason, hint: `DFN ${dfn} not found in VistA` };
    }

    const name = parts[0] || "";
    const sex = parts[1] || "";
    const dobFM = parts[2] || "";

    // Convert FileMan date YYYMMDD → YYYY-MM-DD (YYY = year - 1700)
    let dob = dobFM;
    if (/^\d{7}$/.test(dobFM)) {
      const y = parseInt(dobFM.substring(0, 3), 10) + 1700;
      const m = dobFM.substring(3, 5);
      const d = dobFM.substring(5, 7);
      dob = `${y}-${m}-${d}`;
    }

    return {
      ok: true,
      patient: { dfn: String(dfn), name, dob, sex },
      rpcUsed: RPC_NAME,
    };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 5C: Allergies via ORQQAL LIST RPC
server.get("/vista/allergies", async (request) => {
  const dfn = (request.query as any)?.dfn;
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn", hint: "Use ?dfn=1" };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  const RPC_NAME = "ORQQAL LIST";

  try {
    await connect();
    const lines = await callRpc(RPC_NAME, [String(dfn)]);
    disconnect();

    // Each line: id^allergen^severity^reactions (reactions semicolon-separated)
    // "No Allergy Assessment" returns: "^No Allergy Assessment"
    const results = lines
      .map((line) => {
        const parts = line.split("^");
        const id = parts[0]?.trim();
        const allergen = parts[1]?.trim() || "";
        const severity = parts[2]?.trim() || "";
        const reactions = parts[3]?.trim() || "";
        if (!id) return null; // skip "No Allergy Assessment" line
        return { id, allergen, severity, reactions };
      })
      .filter((r) => r !== null);

    return { ok: true, count: results.length, results, rpcUsed: RPC_NAME };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 5D: Add allergy via ORWDAL32 ALLERGY MATCH + ORWDAL32 SAVE ALLERGY RPCs
server.post("/vista/allergies", async (request) => {
  const body = request.body as any;
  const dfn = body?.dfn;
  const allergyText = body?.allergyText;

  // Validate inputs
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn", hint: 'Body: { "dfn": "1", "allergyText": "PENICILLIN" }' };
  }
  if (!allergyText || typeof allergyText !== "string" || allergyText.trim().length < 2) {
    return { ok: false, error: "allergyText must be at least 2 characters", hint: 'Body: { "dfn": "1", "allergyText": "PENICILLIN" }' };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  try {
    await connect();

    // Step 1: Search for matching allergen via ORWDAL32 ALLERGY MATCH
    const matchLines = await callRpc("ORWDAL32 ALLERGY MATCH", [allergyText.trim().toUpperCase()]);

    // Find the first non-TOP entry from the VA Allergies file (GMRD(120.82,"B"))
    // Format: IEN^name^source_global^allergyType^sourceNum
    let matchEntry: { ien: string; name: string; source: string; allergyType: string } | null = null;
    for (const line of matchLines) {
      const parts = line.split("^");
      const ien = parts[0]?.trim();
      const name = parts[1]?.trim();
      const source = parts[2]?.trim() || "";
      const allergyType = parts[3]?.trim() || "";
      // Skip TOP/header lines (source is empty for headers)
      if (!source || !ien) continue;
      // Prefer VA Allergies file (GMRD(120.82)), but accept any match
      if (source.includes("GMRD(120.82")) {
        matchEntry = { ien, name, source, allergyType };
        break;
      }
      // Fall back to first non-header match
      if (!matchEntry) {
        matchEntry = { ien, name, source, allergyType };
      }
    }

    if (!matchEntry) {
      disconnect();
      return {
        ok: false,
        error: `No matching allergen found for "${allergyText.trim()}"`,
        hint: "Try a different allergen name (e.g., PENICILLIN, PEANUT, ASPIRIN)",
      };
    }

    // Step 2: Build OREDITED list for ORWDAL32 SAVE ALLERGY
    // Required fields based on EDITSAVE^ORWDAL32 -> UPDATE^GMRAGUI1
    const duz = getDuz();
    // Strip the B-index qualifier (e.g. "B") → "D") from source, keep trailing comma
    const sourceGlobal = matchEntry.source.replace(/"B"\)$|"D"\)$|"T"\)$|"P"\)$|"C"\)$/, "");
    // GMRAGNT format: NAME^IEN;file_root  (semicolon between IEN and global ref)
    // UPDATE splits on "^": piece1=NAME (.02 field), piece2=IEN;root (cross-ref source)
    const gmragnt = matchEntry.name + "^" + matchEntry.ien + ";" + sourceGlobal;
    const allergyType = matchEntry.allergyType || "D";

    // Build FileMan date/time for GMRAORDT: YYYMMDD.HHMMSS (YYY = year - 1700)
    const now = new Date();
    const fmYear = now.getFullYear() - 1700;
    const fmDate = `${fmYear}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

    const oredited: Record<string, string> = {
      "GMRAGNT": gmragnt,
      "GMRATYPE": allergyType,
      "GMRANATR": "U^Unknown",
      "GMRAORIG": duz,
      "GMRAORDT": fmDate,
      "GMRAOBHX": "h^HISTORICAL",
    };

    // ORALIEN=0 for new allergy, ORDFN=dfn, OREDITED=list
    const saveLines = await callRpcWithList("ORWDAL32 SAVE ALLERGY", [
      { type: "literal", value: "0" },
      { type: "literal", value: String(dfn) },
      { type: "list", value: oredited },
    ]);

    disconnect();

    const result = saveLines.join("\n").trim();
    // SAVE ALLERGY returns "0" on success, or "-1^error message" on failure
    if (result.startsWith("-1")) {
      const errMsg = result.split("^").slice(1).join("^") || "Save failed";
      return { ok: false, error: errMsg, hint: "The allergy could not be saved" };
    }

    return {
      ok: true,
      message: "Allergy created",
      allergen: matchEntry.name,
      result,
      rpcUsed: "ORWDAL32 SAVE ALLERGY",
    };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 6A: Vitals via ORQQVI VITALS RPC
server.get("/vista/vitals", async (request) => {
  const dfn = (request.query as any)?.dfn;
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn", hint: "Use ?dfn=1" };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  // ORQQVI VITALS params: (DFN, ORSDT, OREDT)
  //   DFN   = patient IEN
  //   ORSDT = start date in FileMan format (use 0 for earliest)
  //   OREDT = end date in FileMan format (use a far-future date)
  const RPC_NAME = "ORQQVI VITALS";

  try {
    await connect();

    // Wide date range: 2000-01-01 (3000101) to 2099-12-31 (3991231)
    const lines = await callRpc(RPC_NAME, [String(dfn), "3000101", "3991231"]);
    disconnect();

    // Response format: ien^type^value^datetime
    // (Note: MUMPS comment says ien^type^datetime^rate but actual wire is reversed)
    // Informational line: "^No vitals found." — id is empty
    const results = lines
      .map((line) => {
        const parts = line.split("^");
        const id = parts[0]?.trim();
        const type = parts[1]?.trim() || "";
        const value = parts[2]?.trim() || "";
        const takenAtFM = parts[3]?.trim() || "";
        if (!id) return null; // skip informational lines like "^No vitals found."

        // Convert FileMan date YYYMMDD.HHMMSS → human-readable YYYY-MM-DD HH:MM
        let takenAt = takenAtFM;
        if (takenAtFM && takenAtFM.length >= 7) {
          const datePart = takenAtFM.split(".")[0] || "";
          const timePart = takenAtFM.split(".")[1] || "";
          if (/^\d{7}$/.test(datePart)) {
            const y = parseInt(datePart.substring(0, 3), 10) + 1700;
            const m = datePart.substring(3, 5);
            const d = datePart.substring(5, 7);
            let timeStr = "";
            if (timePart && timePart.length >= 4) {
              timeStr = " " + timePart.substring(0, 2) + ":" + timePart.substring(2, 4);
            }
            takenAt = `${y}-${m}-${d}${timeStr}`;
          }
        }

        return { type, value, takenAt };
      })
      .filter((r) => r !== null);

    return { ok: true, count: results.length, results, rpcUsed: RPC_NAME };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 6B: Add a vital via GMV ADD VM RPC
// Vital type abbreviation → IEN in file 120.51 (WorldVistA defaults)
const VITAL_TYPE_IEN: Record<string, number> = {
  BP: 1, T: 2, R: 3, P: 5, HT: 8, WT: 9, PO2: 21, PN: 22,
};
const VALID_VITAL_TYPES = Object.keys(VITAL_TYPE_IEN);

server.post("/vista/vitals", async (request) => {
  const body = request.body as any;
  const dfn = body?.dfn;
  const type = (body?.type || "").toUpperCase().trim();
  const value = (body?.value || "").trim();

  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn", hint: 'Body: { "dfn": "1", "type": "BP", "value": "120/80" }' };
  }
  if (!type || !VITAL_TYPE_IEN[type]) {
    return { ok: false, error: `Invalid vital type. Must be one of: ${VALID_VITAL_TYPES.join(", ")}`, hint: 'Body: { "dfn": "1", "type": "BP", "value": "120/80" }' };
  }
  if (!value || value.length < 1) {
    return { ok: false, error: "Missing value", hint: 'Body: { "dfn": "1", "type": "BP", "value": "120/80" }' };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  try {
    await connect();
    const duz = getDuz();

    // Build FileMan date for "now": YYYMMDD.HHMM (YYY = year - 1700)
    const now = new Date();
    const fmYear = now.getFullYear() - 1700;
    const fmMonth = String(now.getMonth() + 1).padStart(2, "0");
    const fmDay = String(now.getDate()).padStart(2, "0");
    const fmHour = String(now.getHours()).padStart(2, "0");
    const fmMin = String(now.getMinutes()).padStart(2, "0");
    const fmDate = `${fmYear}${fmMonth}${fmDay}.${fmHour}${fmMin}`;

    const vitalTypeIen = VITAL_TYPE_IEN[type];

    // GMV ADD VM format: datetime^DFN^vitalTypeIEN;reading;^hospitalLocation^DUZ
    // Hospital location 2 = DR OFFICE (default in WorldVistA)
    const hospitalLocation = 2;
    const gmvData = `${fmDate}^${dfn}^${vitalTypeIen};${value};^${hospitalLocation}^${duz}`;

    // GMV ADD VM takes a single literal string param
    const lines = await callRpc("GMV ADD VM", [gmvData]);
    disconnect();

    // Check for errors: GMVDCSAV sets RESULT(n) = "ERROR: ..." on failure
    const allText = lines.join("\n");
    if (allText.includes("ERROR")) {
      return {
        ok: false,
        error: allText.trim() || "VistA returned an error",
        hint: "The vital could not be saved",
      };
    }

    return {
      ok: true,
      message: "Vital recorded",
      type,
      value,
      rpcUsed: "GMV ADD VM",
    };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 7A: Notes list via TIU DOCUMENTS BY CONTEXT
server.get("/vista/notes", async (request) => {
  const { dfn } = request.query as any;
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn query parameter", hint: "Example: /vista/notes?dfn=1" };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  const RPC_NAME = "TIU DOCUMENTS BY CONTEXT";
  try {
    await connect();

    // Params: CLASS, CONTEXT, DFN, EARLY, LATE, PERSON, OCCLIM, SEQUENCE
    // CLASS=3 (progress notes), CONTEXT=1 (all signed), PERSON=0 (all authors)
    const lines = await callRpc(RPC_NAME, [
      "3",          // CLASS - progress notes (document definition 8925.1)
      "1",          // CONTEXT - all signed
      String(dfn),  // DFN - patient
      "",           // EARLY - no start filter
      "",           // LATE - no end filter
      "0",          // PERSON - all authors
      "0",          // OCCLIM - no limit
      "D",          // SEQUENCE - descending (newest first)
    ]);
    disconnect();

    // Check for -1^error pattern
    if (lines.length === 1 && lines[0].startsWith("-1")) {
      const errMsg = lines[0].split("^").slice(1).join("^") || "Unknown VistA error";
      return { ok: false, error: errMsg, rpcUsed: RPC_NAME };
    }

    // Wire format per line:
    // IEN^title^editDate(FM)^patient^authorDUZ;sigName;authorName^location^status^visitDate^...
    const results = lines
      .map((line) => {
        const parts = line.split("^");
        if (parts.length < 7) return null;

        const id = parts[0].trim();
        if (!id || !/^\d+$/.test(id)) return null;

        const title = (parts[1] || "").replace(/^\+\s*/, "").trim();
        const fmDate = parts[2] || "";
        const authorField = parts[4] || "";
        const location = parts[5] || "";
        const status = parts[6] || "";

        // Convert FileMan date YYYMMDD.HHMM → YYYY-MM-DD HH:MM
        let date = fmDate;
        if (fmDate && fmDate.length >= 7) {
          const [datePart, timePart] = fmDate.split(".");
          const y = parseInt(datePart.substring(0, 3), 10) + 1700;
          const m = datePart.substring(3, 5);
          const d = datePart.substring(5, 7);
          date = `${y}-${m}-${d}`;
          if (timePart && timePart.length >= 4) {
            date += ` ${timePart.substring(0, 2)}:${timePart.substring(2, 4)}`;
          }
        }

        // Author: "DUZ;sigName;displayName" → use displayName
        const authorParts = authorField.split(";");
        const author = authorParts.length >= 3 ? authorParts[2] : authorParts[1] || authorField;

        return { id, title, date, author, location, status };
      })
      .filter(Boolean);

    return { ok: true, count: results.length, results, rpcUsed: RPC_NAME };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 4A: Real RPC call to get default patient list
server.get("/vista/default-patient-list", async () => {
  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  try {
    // Connect and sign on to Broker
    await connect();

    // Call ORQPT DEFAULT PATIENT LIST RPC
    // This RPC returns a list of patients in the format: DFN^PATIENT NAME
    const lines = await callRpc("ORQPT DEFAULT PATIENT LIST", []);

    // Parse response: each line is "DFN^NAME"
    const results = lines
      .map((line) => {
        const [dfn, name] = line.split("^").map((s) => s.trim());
        if (dfn && name) {
          return { dfn, name };
        }
        return null;
      })
      .filter((r) => r !== null);

    disconnect();

    return { ok: true, count: results.length, results };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

const port = Number(process.env.PORT || 3001)
const host = process.env.HOST || "127.0.0.1"

try {
  await server.listen({ port, host });
  console.log(`Server listening on http://${host}:${port}`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
