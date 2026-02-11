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

    // Fetch signed (CONTEXT=1) and unsigned (CONTEXT=2) notes, merge results.
    // CONTEXT=1: all signed, CONTEXT=2: unsigned by current author.
    // Params: CLASS, CONTEXT, DFN, EARLY, LATE, PERSON, OCCLIM, SEQUENCE
    const signedLines = await callRpc(RPC_NAME, [
      "3",          // CLASS - progress notes (document definition 8925.1)
      "1",          // CONTEXT - all signed
      String(dfn),  // DFN - patient
      "",           // EARLY - no start filter
      "",           // LATE - no end filter
      "0",          // PERSON - all authors
      "0",          // OCCLIM - no limit
      "D",          // SEQUENCE - descending (newest first)
    ]);
    const unsignedLines = await callRpc(RPC_NAME, [
      "3",          // CLASS - progress notes
      "2",          // CONTEXT - unsigned
      String(dfn),  // DFN - patient
      "",           // EARLY
      "",           // LATE
      "0",          // PERSON - all authors
      "0",          // OCCLIM
      "D",          // SEQUENCE
    ]);
    disconnect();

    // Merge lines, dedup by IEN (unsigned first so newest show at top)
    const seenIens = new Set<string>();
    const allLines: string[] = [];
    for (const line of [...unsignedLines, ...signedLines]) {
      const ien = line.split("^")[0]?.trim();
      if (ien && /^\d+$/.test(ien) && !seenIens.has(ien)) {
        seenIens.add(ien);
        allLines.push(line);
      }
    }

    // Check for -1^error pattern (from either call)
    const errorLine = [...signedLines, ...unsignedLines].find(l => l.startsWith("-1"));
    if (errorLine && allLines.length === 0) {
      const errMsg = errorLine.split("^").slice(1).join("^") || "Unknown VistA error";
      return { ok: false, error: errMsg, rpcUsed: RPC_NAME };
    }

    // Wire format per line:
    // IEN^title^editDate(FM)^patient^authorDUZ;sigName;authorName^location^status^visitDate^...
    const results = allLines
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

// Phase 7B: Create note via TIU CREATE RECORD + TIU SET DOCUMENT TEXT
server.post("/vista/notes", async (request) => {
  const body = request.body as any;
  const dfn = body?.dfn;
  const title = (body?.title || "").trim();
  const text = (body?.text || "").trim();

  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn", hint: 'Body: { "dfn": "1", "title": "TEST NOTE", "text": "hello world" }' };
  }
  if (!title || title.length < 1) {
    return { ok: false, error: "Missing title", hint: 'Body: { "dfn": "1", "title": "TEST NOTE", "text": "hello world" }' };
  }
  if (!text || text.length < 1) {
    return { ok: false, error: "Missing text", hint: 'Body: { "dfn": "1", "title": "TEST NOTE", "text": "hello world" }' };
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

    // STEP 1: TIU CREATE RECORD
    //   MAKE(SUCCESS,DFN,TITLE,VDT,VLOC,VSIT,TIUX,VSTR,SUPPRESS,NOASF)
    //   Title IEN 10 = GENERAL NOTE (DOC type in 8925.1)
    //   VLOC 2 = DR OFFICE (hospital location)
    //   TIUX: 1202=Author(DUZ), 1301=RefDate
    const TITLE_IEN = "10";   // GENERAL NOTE
    const VLOC = "2";         // DR OFFICE
    const tiux: Record<string, string> = {
      "1202": String(duz),   // Author/dictator
      "1301": fmDate,        // Reference date
    };

    const createLines = await callRpcWithList("TIU CREATE RECORD", [
      { type: "literal", value: String(dfn) },    // DFN
      { type: "literal", value: TITLE_IEN },       // TITLE
      { type: "literal", value: fmDate },          // VDT
      { type: "literal", value: VLOC },            // VLOC
      { type: "literal", value: "" },              // VSIT
      { type: "list", value: tiux },               // TIUX (field data, no text)
      { type: "literal", value: "" },              // VSTR
      { type: "literal", value: "1" },             // SUPPRESS (suppress alerts)
      { type: "literal", value: "0" },             // NOASF
    ]);

    const createResult = createLines[0] || "";
    if (createResult.startsWith("0^") || createResult.startsWith("-1")) {
      const errMsg = createResult.split("^").slice(1).join("^") || "Failed to create note record";
      disconnect();
      return { ok: false, error: errMsg, hint: "TIU CREATE RECORD failed" };
    }

    const noteId = createResult.split("^")[0].trim();
    if (!noteId || !/^\d+$/.test(noteId)) {
      disconnect();
      return { ok: false, error: `Unexpected response: ${createResult}`, hint: "TIU CREATE RECORD returned non-numeric ID" };
    }

    // STEP 2: TIU SET DOCUMENT TEXT
    //   SETTEXT(TIUY,TIUDA,TIUX,SUPPRESS)
    //   TIUX: HDR="page^pages", TEXT,N,0 = line N
    // Build user-supplied title as first line, then text body
    const bodyLines = text.split(/\r?\n/);
    const allLines = [title, "", ...bodyLines];
    const textData: Record<string, string> = {
      "HDR": "1^1",
    };
    allLines.forEach((line, i) => {
      textData[`TEXT,${i + 1},0`] = line;
    });

    const textResult = await callRpcWithList("TIU SET DOCUMENT TEXT", [
      { type: "literal", value: noteId },       // TIUDA
      { type: "list", value: textData },         // TIUX (HDR + TEXT lines)
      { type: "literal", value: "0" },           // SUPPRESS
    ]);

    disconnect();

    const textResp = textResult[0] || "";
    // SETTEXT returns "TIUDA^page^pages" on success, "0^...^...^error" on failure
    if (textResp.startsWith("0^")) {
      return {
        ok: false,
        error: `Note ${noteId} created but text save failed: ${textResp}`,
        id: noteId,
        hint: "TIU SET DOCUMENT TEXT failed",
      };
    }

    return {
      ok: true,
      id: noteId,
      message: "Note created",
      rpcUsed: "TIU CREATE RECORD + TIU SET DOCUMENT TEXT",
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

// Phase 8A: Medications list via ORWPS ACTIVE + ORWORR GETTXT
server.get("/vista/medications", async (request) => {
  const { dfn } = request.query as any;
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn query parameter", hint: "Example: /vista/medications?dfn=1" };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  try {
    await connect();

    // Step 1: ORWPS ACTIVE returns active meds grouped by type
    // Params: DFN (LITERAL)
    // Output: header lines starting with ~ and continuation lines for qty/sig
    const activeLines = await callRpc("ORWPS ACTIVE", [String(dfn)]);

    // Check for -1^error
    if (activeLines.length > 0 && activeLines[0].startsWith("-1")) {
      const errMsg = activeLines[0].split("^").slice(1).join("^") || "Unknown VistA error";
      disconnect();
      return { ok: false, error: errMsg, rpcUsed: "ORWPS ACTIVE" };
    }

    // Parse header lines to build medication objects
    // Header: ~TYPE^rxIEN;kind^drugName^?^?^?^?^?^orderIEN^status^?^?^qty^?^?
    // Continuation: "   Qty: N", "\ Sig: ..."
    interface MedEntry {
      orderIEN: string;
      rxId: string;
      type: string;      // OP, NV, UD, IV, CP
      drugName: string;   // often empty in WorldVistA Docker
      status: string;
      qty: string;
      sig: string;
    }

    const meds: MedEntry[] = [];
    let current: MedEntry | null = null;

    for (const line of activeLines) {
      if (line.startsWith("~")) {
        // New medication header
        const typeEnd = line.indexOf("^");
        const type = line.substring(1, typeEnd); // e.g., "OP"
        const fields = line.substring(typeEnd + 1).split("^");
        // fields[0]=rxIEN;kind, fields[1]=drugName, fields[7]=orderIEN, fields[8]=status, fields[11]=qty
        current = {
          orderIEN: fields[7]?.trim() || "",
          rxId: fields[0]?.split(";")[0] || "",
          type,
          drugName: fields[1]?.trim() || "",
          status: fields[8]?.trim() || "",
          qty: fields[11]?.trim() || "",
          sig: "",
        };
        meds.push(current);
      } else if (current) {
        // Continuation line
        const trimmed = line.trim();
        if (trimmed.startsWith("\\ Sig:") || trimmed.startsWith("\\Sig:")) {
          current.sig = trimmed.replace(/^\\\s*Sig:\s*/i, "").trim();
        } else if (trimmed.startsWith("Qty:")) {
          current.qty = trimmed.replace(/^Qty:\s*/, "").trim();
        }
      }
    }

    // Step 2: For meds with empty drug name, call ORWORR GETTXT to resolve it
    for (const med of meds) {
      if (!med.drugName && med.orderIEN && /^\d+$/.test(med.orderIEN)) {
        try {
          const txtLines = await callRpc("ORWORR GETTXT", [med.orderIEN]);
          if (txtLines.length > 0 && !txtLines[0].startsWith("-1")) {
            med.drugName = txtLines[0].trim();
            // If sig was empty, grab it from GETTXT line 1
            if (!med.sig && txtLines[1]) {
              med.sig = txtLines[1].trim();
            }
          }
        } catch {
          // Non-fatal: leave drugName empty
        }
      }
    }

    disconnect();

    const results = meds.map((m) => ({
      id: m.rxId || m.orderIEN,
      name: m.drugName || "(unknown medication)",
      sig: m.sig,
      status: m.status.toLowerCase() || "active",
    }));

    return { ok: true, count: results.length, results, rpcUsed: "ORWPS ACTIVE" };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 8B: Add medication via ORWDXM AUTOACK (quick order path)
//
// VistA CPOE (Computerized Provider Order Entry) is extremely complex:
//   Full flow: LOCK → build ORDIALOG (13+ params) → SAVE → order checks → SEND (e-sig) → UNLOCK
//   AUTOACK simplify: LOCK → AUTOACK(DFN, DUZ, Location, QuickOrder) → UNLOCK
//
// MVP approach: match drug name to pre-configured quick orders (PSOZ*) in the
// WorldVistA Docker sandbox, then use AUTOACK to place an unsigned order.
// Drugs without a matching quick order return an honest error explaining the limitation.
//
// Quick orders available in WorldVistA Docker (IEN → drug name keyword):
const QUICK_ORDERS: { ien: number; name: string; keywords: string[] }[] = [
  { ien: 1638, name: "ASPIRIN CHEW",        keywords: ["ASPIRIN CHEW", "ASPIRIN CHEWABLE", "ASA CHEW"] },
  { ien: 1639, name: "ASPIRIN TAB EC",      keywords: ["ASPIRIN TAB", "ASPIRIN EC", "ASA TAB", "ASPIRIN"] },
  { ien: 1640, name: "ATENOLOL TAB",        keywords: ["ATENOLOL"] },
  { ien: 1641, name: "ATORVASTATIN TAB",    keywords: ["ATORVASTATIN", "LIPITOR"] },
  { ien: 1642, name: "BENAZEPRIL TAB",      keywords: ["BENAZEPRIL"] },
  { ien: 1643, name: "CANDESARTAN TAB",     keywords: ["CANDESARTAN"] },
  { ien: 1644, name: "CAPTOPRIL TAB",       keywords: ["CAPTOPRIL"] },
  { ien: 1645, name: "CARVEDILOL TAB",      keywords: ["CARVEDILOL"] },
  { ien: 1646, name: "ENALAPRIL TAB",       keywords: ["ENALAPRIL"] },
  { ien: 1658, name: "FLUVASTATIN CAP",     keywords: ["FLUVASTATIN CAP"] },
  { ien: 1647, name: "FLUVASTATIN XL TAB",  keywords: ["FLUVASTATIN TAB", "FLUVASTATIN XL", "FLUVASTATIN"] },
  { ien: 1648, name: "LISINOPRIL TAB",      keywords: ["LISINOPRIL"] },
  { ien: 1649, name: "LOSARTAN TAB",        keywords: ["LOSARTAN"] },
  { ien: 1650, name: "LOVASTATIN TAB",      keywords: ["LOVASTATIN"] },
  { ien: 1651, name: "METOPROLOL TAB",      keywords: ["METOPROLOL"] },
  { ien: 1652, name: "NADOLOL TAB",         keywords: ["NADOLOL"] },
  { ien: 1653, name: "CLOPIDOGREL TAB",     keywords: ["CLOPIDOGREL", "PLAVIX"] },
  { ien: 1654, name: "PRAVASTATIN TAB",     keywords: ["PRAVASTATIN"] },
  { ien: 1655, name: "PROPRANOLOL TAB",     keywords: ["PROPRANOLOL"] },
  { ien: 1656, name: "ROSUVASTATIN TAB",    keywords: ["ROSUVASTATIN", "CRESTOR"] },
  { ien: 1657, name: "SIMVASTATIN TAB",     keywords: ["SIMVASTATIN", "ZOCOR"] },
  { ien: 1628, name: "WARFARIN",            keywords: ["WARFARIN", "COUMADIN"] },
];

/** Find the best-matching quick order for a drug name. */
function matchQuickOrder(drug: string): (typeof QUICK_ORDERS)[number] | null {
  const upper = drug.toUpperCase().trim();
  // Exact keyword match first
  for (const qo of QUICK_ORDERS) {
    for (const kw of qo.keywords) {
      if (upper === kw) return qo;
    }
  }
  // Substring match (drug contains keyword or keyword contains drug)
  for (const qo of QUICK_ORDERS) {
    for (const kw of qo.keywords) {
      if (upper.includes(kw) || kw.includes(upper)) return qo;
    }
  }
  return null;
}

server.post("/vista/medications", async (request) => {
  const body = request.body as any;
  const dfn = body?.dfn;
  const drug = body?.drug;

  // Validate inputs
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return {
      ok: false,
      error: "Missing or non-numeric dfn",
      hint: 'Body: { "dfn": "1", "drug": "ASPIRIN" }',
    };
  }
  if (!drug || typeof drug !== "string" || drug.trim().length < 2) {
    return {
      ok: false,
      error: "drug must be at least 2 characters",
      hint: 'Body: { "dfn": "1", "drug": "ASPIRIN" }',
    };
  }

  // Match drug name to a pre-configured quick order
  const qo = matchQuickOrder(drug);
  if (!qo) {
    const available = QUICK_ORDERS.map((q) => q.name).join(", ");
    return {
      ok: false,
      error: `No matching quick order for "${drug.trim()}". VistA CPOE ordering is ` +
        `complex and requires pre-configured quick orders in this sandbox.`,
      availableDrugs: available,
      hint: "Available quick-order drugs: " + available,
    };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  try {
    await connect();
    const duz = getDuz();

    // Step 1: Lock patient for ordering
    const lockLines = await callRpc("ORWDX LOCK", [String(dfn)]);
    const lockResult = lockLines[0]?.trim() || "";
    if (lockResult !== "1") {
      disconnect();
      return {
        ok: false,
        error: "Could not lock patient for ordering: " + (lockResult || "empty response"),
        hint: "Another user may be placing orders for this patient",
      };
    }

    // Step 2: AUTOACK — place quick order without verify step
    // Params: ORVP=DFN, ORNP=DUZ, ORL=Location(2=DR OFFICE), ORIT=QuickOrderIEN
    const LOCATION_IEN = "2"; // DR OFFICE in WorldVistA Docker
    let autoackLines: string[];
    try {
      autoackLines = await callRpc("ORWDXM AUTOACK", [
        String(dfn),
        duz,
        LOCATION_IEN,
        String(qo.ien),
      ]);
    } catch (autoackErr: any) {
      // Unlock patient before returning error
      try { await callRpc("ORWDX UNLOCK", [String(dfn)]); } catch { /* best-effort */ }
      disconnect();
      return {
        ok: false,
        error: "AUTOACK failed: " + autoackErr.message,
        hint: "VistA CPOE quick-order placement failed. This may require full dialog-based ordering.",
      };
    }

    // Step 3: Unlock patient
    try { await callRpc("ORWDX UNLOCK", [String(dfn)]); } catch { /* best-effort */ }

    disconnect();

    // Parse AUTOACK response — returns order record lines from GETBYIFN^ORWORR
    // Format: orderIEN;status^...  or multiple lines describing the new order
    const raw = autoackLines.join("\n").trim();
    if (!raw || raw === "0" || raw.startsWith("-1")) {
      return {
        ok: false,
        error: "Order was not created. AUTOACK returned: " + (raw || "(empty)"),
        hint: "The quick order may be misconfigured or the patient context invalid.",
      };
    }

    // Extract order IEN from response (first field before ^ or ;, strip leading ~)
    const orderIEN = (raw.split(/[\^;]/)[0]?.trim() || raw).replace(/^~/, "");

    return {
      ok: true,
      message: `Medication order created (unsigned): ${qo.name}`,
      orderIEN,
      quickOrder: qo.name,
      raw: autoackLines,
      rpcUsed: "ORWDXM AUTOACK",
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

// Phase 9A: Problem List via ORWCH PROBLEM LIST RPC
server.get("/vista/problems", async (request) => {
  const dfn = (request.query as any)?.dfn;
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn query parameter", hint: "Example: /vista/problems?dfn=1" };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  const RPC_NAME = "ORWCH PROBLEM LIST";

  try {
    await connect();

    // ORWCH PROBLEM LIST params: (DFN, FLAG)
    // DFN   = patient IEN
    // FLAG  = 1 for active problems only, 0 for all
    const lines = await callRpc(RPC_NAME, [String(dfn), "0"]);

    disconnect();

    // Check for -1^error pattern
    if (lines.length > 0 && lines[0].startsWith("-1")) {
      const errMsg = lines[0].split("^").slice(1).join("^") || "Unknown VistA error";
      return { ok: false, error: errMsg, rpcUsed: RPC_NAME };
    }

    // Parse problem list lines
    // Wire format per line: IEN^problem_text^status^onset_date^...
    // where status is typically: "A" (active), "I" (inactive), etc.
    interface ProblemEntry {
      id: string;
      text: string;
      status: string;
      onset?: string;
    }

    const results: ProblemEntry[] = lines
      .map((line) => {
        if (!line || line.trim() === "") return null;
        const parts = line.split("^");
        if (parts.length < 2) return null;

        const ien = parts[0]?.trim();
        const text = parts[1]?.trim();
        const status = parts[2]?.trim() || "Unknown";
        const onset = parts[3]?.trim() || "";

        // Skip empty entries
        if (!ien || !text) return null;

        // Simplify status for display
        let displayStatus = "active";
        if (status.toUpperCase().includes("I") || status === "0") {
          displayStatus = "inactive";
        } else if (status.toUpperCase().includes("R") || status === "2") {
          displayStatus = "resolved";
        }

        return {
          id: ien,
          text,
          status: displayStatus,
          onset: onset || undefined,
        };
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

const port = Number(process.env.PORT || 3001)
const host = process.env.HOST || "127.0.0.1"

try {
  await server.listen({ port, host });
  console.log(`Server listening on http://${host}:${port}`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
