import { createConnection } from "net";
import { VISTA_HOST, VISTA_PORT, VISTA_ACCESS_CODE, VISTA_VERIFY_CODE } from "./config";

// Minimal, honest RPC Broker helper.
// This module performs a TCP connectivity check and explains what blocks a full
// RPC Broker sign-on. It does NOT implement the full VistA RPC Broker binary
// protocol (framing, authentication tokens, RPC packet format). Implementing
// that requires a dedicated protocol implementation or a native bridge
// (e.g., mg-dbx-napi).

export async function probeConnect(timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: VISTA_HOST, port: VISTA_PORT });
    const to = setTimeout(() => {
      socket.destroy();
      reject(new Error("connection timeout"));
    }, timeoutMs);

    socket.once("connect", () => {
      clearTimeout(to);
      socket.end();
      resolve();
    });

    socket.once("error", (err) => {
      clearTimeout(to);
      reject(err);
    });
  });
}

export async function signOn(): Promise<never> {
  // We intentionally do not fake sign-on. Explain what's required.
  if (!VISTA_ACCESS_CODE || !VISTA_VERIFY_CODE) {
    throw new Error("missing VISTA_ACCESS_CODE or VISTA_VERIFY_CODE environment variables");
  }
  throw new Error(
    "RPC Broker sign-on not implemented: requires VistA RPC Broker packet framing and RPC protocol. " +
      "Use a dedicated client (e.g., mg-dbx-napi) or implement the Broker protocol before attempting login."
  );
}

export async function patientSearch(_query: string): Promise<never> {
  // Placeholder: performing a patient search requires authenticated RPC calls
  // using the Broker protocol. Do not attempt to fake results here.
  throw new Error(
    "patientSearch not implemented: requires RPC call (ORQPT FIND PATIENT) over Broker after authentication"
  );
}
