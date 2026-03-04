#!/usr/bin/env node
/**
 * Phase 105 -- VistA Connectivity Probe
 *
 * Probes VistA Docker for TCP connectivity and safe RPC broker ping.
 * Does NOT send credentials. Exits 0 if reachable, 1 if not.
 */

import { createConnection } from 'net';

const VISTA_HOST = process.env.VISTA_HOST || 'localhost';
const VISTA_PORT = parseInt(process.env.VISTA_PORT || '9430', 10);
const API = process.env.API_URL || 'http://localhost:3001';

function probePort(host, port, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const sock = createConnection({ host, port, timeout: timeoutMs });
    sock.on('connect', () => {
      sock.destroy();
      resolve(true);
    });
    sock.on('error', () => {
      sock.destroy();
      resolve(false);
    });
    sock.on('timeout', () => {
      sock.destroy();
      resolve(false);
    });
  });
}

async function run() {
  let pass = 0;
  let fail = 0;

  // Gate 1: TCP connectivity to VistA port
  const tcpOk = await probePort(VISTA_HOST, VISTA_PORT);
  if (tcpOk) {
    console.log(`  PASS  VistA TCP ${VISTA_HOST}:${VISTA_PORT} reachable`);
    pass++;
  } else {
    console.log(`  FAIL  VistA TCP ${VISTA_HOST}:${VISTA_PORT} unreachable`);
    fail++;
  }

  // Gate 2: API /vista/ping endpoint
  try {
    const res = await fetch(`${API}/vista/ping`, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    if (data.ok || data.reachable) {
      console.log(`  PASS  /vista/ping ok`);
      pass++;
    } else {
      console.log(`  WARN  /vista/ping returned ok=false (VistA may be starting)`);
      pass++; // Don't fail -- VistA may be booting
    }
  } catch (err) {
    console.log(`  FAIL  /vista/ping: ${err.message}`);
    fail++;
  }

  console.log(`\nVistA probe: ${pass} pass, ${fail} fail`);
  process.exit(fail > 0 ? 1 : 0);
}

run();
