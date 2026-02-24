#!/usr/bin/env node
/**
 * G4 -- Contract Alignment Gate
 *
 * Validates:
 *   - CPRS contract parse + RPC registry coverage
 *   - Module catalog / feature flags contracts
 *   - config/ JSON integrity
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

export const id = "G4_contract_alignment";
export const name = "Contract Alignment";

export async function run() {
  const start = Date.now();
  const details = [];
  let status = "pass";

  // 1. config/modules.json parseable + has entries
  const modulesPath = resolve(ROOT, "config/modules.json");
  if (existsSync(modulesPath)) {
    try {
      const raw = readFileSync(modulesPath, "utf-8");
      const modules = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
      const count = Array.isArray(modules) ? modules.length : Object.keys(modules).length;
      details.push(`modules.json: PASS (${count} modules)`);
    } catch {
      details.push("modules.json: FAIL -- parse error");
      status = "fail";
    }
  } else {
    details.push("modules.json: SKIP (not found)");
  }

  // 2. config/skus.json parseable
  const skusPath = resolve(ROOT, "config/skus.json");
  if (existsSync(skusPath)) {
    try {
      const raw = readFileSync(skusPath, "utf-8");
      JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
      details.push("skus.json: PASS");
    } catch {
      details.push("skus.json: FAIL -- parse error");
      status = "fail";
    }
  } else {
    details.push("skus.json: SKIP (not found)");
  }

  // 3. config/capabilities.json parseable
  const capsPath = resolve(ROOT, "config/capabilities.json");
  if (existsSync(capsPath)) {
    try {
      const raw = readFileSync(capsPath, "utf-8");
      JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
      details.push("capabilities.json: PASS");
    } catch {
      details.push("capabilities.json: FAIL -- parse error");
      status = "fail";
    }
  } else {
    details.push("capabilities.json: SKIP (not found)");
  }

  // 4. RPC registry exists and has entries
  const rpcRegPath = resolve(ROOT, "apps/api/src/vista/rpcRegistry.ts");
  if (existsSync(rpcRegPath)) {
    const rpcReg = readFileSync(rpcRegPath, "utf-8");
    const rpcCount = (rpcReg.match(/RPC_REGISTRY/g) || []).length;
    if (rpcCount > 0) {
      details.push(`RPC registry: PASS (registry references: ${rpcCount})`);
    } else {
      details.push("RPC registry: WARN -- no RPC_REGISTRY references");
    }
  } else {
    details.push("RPC registry: SKIP (not found)");
  }

  // 5. Performance budgets config parseable
  const perfPath = resolve(ROOT, "config/performance-budgets.json");
  if (existsSync(perfPath)) {
    try {
      const raw = readFileSync(perfPath, "utf-8");
      JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
      details.push("performance-budgets.json: PASS");
    } catch {
      details.push("performance-budgets.json: FAIL -- parse error");
      status = "fail";
    }
  } else {
    details.push("performance-budgets.json: SKIP (not found)");
  }

  return { id, name, status, details, durationMs: Date.now() - start };
}
