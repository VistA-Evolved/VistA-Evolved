import Fastify from "fastify";
import { probeConnect, signOn, patientSearch } from "./vista/rpcBroker";
import { requireCredentials, validateCredentials } from "./vista/config";
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

// Phase 4: patient search endpoint (minimal proof)
server.get("/vista/patient-search", async (request) => {
  const q = (request.query as any)?.q;
  if (!q || typeof q !== "string") {
    return { ok: false, error: "missing query parameter 'q'", hint: "Provide ?q=<search>" };
  }

  try {
    await probeConnect();
  } catch (err: any) {
    return { ok: false, error: `VistA RPC not reachable: ${err.message}`, hint: "Start sandbox and ensure port is reachable" };
  }

  if (!requireCredentials()) {
    return { ok: false, error: "missing credentials", hint: "Set VISTA_ACCESS_CODE and VISTA_VERIFY_CODE in environment" };
  }

  try {
    // This path still uses the legacy rpcBroker.signOn() stub.
    // The XWB protocol is implemented in rpcBrokerClient.ts — this
    // endpoint needs to be migrated to use it with the right search RPC.
    await signOn();
    // If signOn ever succeeds, call patientSearch (not implemented)
    const results = await patientSearch(q);
    return { ok: true, results };
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Patient search RPC not yet mapped; protocol is ready — see docs/runbooks/vista-rpc-patient-search.md" };
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
