#!/usr/bin/env node
/**
 * Phase 105 -- API Health Gate
 *
 * Checks that the API server is running and healthy.
 * Exits 0 if healthy, 1 if not.
 */

const API = process.env.API_URL || "http://localhost:3001";

async function checkHealth() {
  try {
    const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (data.ok) {
      console.log(`API healthy: version=${data.version}, uptime=${Math.round(data.uptime)}s`);
      return true;
    }
    console.error("API returned ok=false:", JSON.stringify(data));
    return false;
  } catch (err) {
    console.error(`API not reachable at ${API}/health: ${err.message}`);
    return false;
  }
}

const ok = await checkHealth();
// Allow event loop to drain before exiting (avoids Node 24 UV_HANDLE_CLOSING assertion)
setTimeout(() => process.exit(ok ? 0 : 1), 50);
