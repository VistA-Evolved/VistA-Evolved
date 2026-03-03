#!/usr/bin/env node
/**
 * scripts/regen-rpc-snapshot.mjs — Regenerates data/vista/rpc-catalog-snapshot.json
 *
 * Reads apps/api/src/vista/rpcRegistry.ts and extracts all RPC entries
 * and exceptions, then writes a fresh snapshot file.
 *
 * Usage: node scripts/regen-rpc-snapshot.mjs [--dry-run]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const REGISTRY_PATH = resolve(ROOT, "apps/api/src/vista/rpcRegistry.ts");
const SNAPSHOT_PATH = resolve(ROOT, "data/vista/rpc-catalog-snapshot.json");

const dryRun = process.argv.includes("--dry-run");

const regSrc = readFileSync(REGISTRY_PATH, "utf-8");

// Split file at RPC_EXCEPTIONS to separate the two arrays
const exceptIdx = regSrc.indexOf("export const RPC_EXCEPTIONS");
const registrySrc = exceptIdx > 0 ? regSrc.slice(0, exceptIdx) : regSrc;
const exceptionSrc = exceptIdx > 0 ? regSrc.slice(exceptIdx) : "";

function extractEntries(src) {
  const entries = [];
  // Match each { name: "...", ... } object — handles multi-line
  const objRe = /\{\s*name:\s*["']([^"']+)["']([^}]*)\}/g;
  let m;
  while ((m = objRe.exec(src)) !== null) {
    const name = m[1];
    const rest = m[2];

    // Extract domain if present
    const domainMatch = rest.match(/domain:\s*["']([^"']+)["']/);
    const domain = domainMatch ? domainMatch[1] : undefined;

    // Extract tag (singular string) — used by RPC_REGISTRY
    const tagMatch = rest.match(/\btag:\s*["']([^"']+)["']/);
    const tag = tagMatch ? tagMatch[1] : undefined;

    // Extract tags (plural array) — used by RPC_EXCEPTIONS
    const tagsMatch = rest.match(/tags:\s*\[([^\]]*)\]/);
    let tags;
    if (tagsMatch) {
      tags = tagsMatch[1]
        .split(",")
        .map((t) => t.trim().replace(/["']/g, ""))
        .filter(Boolean);
    }

    // Extract reason if present (for exceptions)
    const reasonMatch = rest.match(/reason:\s*["']([^"']+)["']/);
    const reason = reasonMatch ? reasonMatch[1] : undefined;

    // Extract description if present
    const descMatch = rest.match(/description:\s*["']([^"']+)["']/);
    const description = descMatch ? descMatch[1] : undefined;

    const entry = { name };
    if (domain) entry.domain = domain;
    if (tag) entry.tag = tag;
    if (tags && tags.length > 0) entry.tags = tags;
    if (reason) entry.reason = reason;
    if (description) entry.description = description;
    entries.push(entry);
  }
  return entries;
}

const registryEntries = extractEntries(registrySrc);
const exceptionEntries = extractEntries(exceptionSrc);

// Build registry object keyed by name
const registry = {};
for (const e of registryEntries) {
  registry[e.name] = {};
  if (e.domain) registry[e.name].domain = e.domain;
  if (e.tag) registry[e.name].tag = e.tag;
  if (e.tags) registry[e.name].tags = e.tags;
  if (e.description) registry[e.name].description = e.description;
}

// Build exceptions array
const exceptions = exceptionEntries.map((e) => {
  const obj = { name: e.name };
  if (e.domain) obj.domain = e.domain;
  if (e.tag) obj.tag = e.tag;
  if (e.tags) obj.tags = e.tags;
  if (e.description) obj.description = e.description;
  return obj;
});

const snapshot = {
  generatedAt: new Date().toISOString(),
  generatedBy: "scripts/regen-rpc-snapshot.mjs",
  registry,
  exceptions,
};

const total = Object.keys(registry).length + exceptions.length;

console.log(`Registry RPCs: ${Object.keys(registry).length}`);
console.log(`Exceptions:    ${exceptions.length}`);
console.log(`Total:         ${total}`);

if (dryRun) {
  console.log(`[DRY RUN] Would write ${SNAPSHOT_PATH}`);
} else {
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n", "utf-8");
  console.log(`Written: ${SNAPSHOT_PATH}`);
}
