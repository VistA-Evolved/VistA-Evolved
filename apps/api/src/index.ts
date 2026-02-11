import Fastify from "fastify";
import { probeConnect } from "./vista/rpcBroker";
import { validateCredentials } from "./vista/config";
import { connect, disconnect, callRpc } from "./vista/rpcBrokerClient";

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
