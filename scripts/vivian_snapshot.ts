#!/usr/bin/env node
/**
 * Vivian/DOX Comprehensive Grounding Snapshot
 *
 * Downloads structured data files from the WorldVistA Vivian site
 * (vivian.worldvista.org) and assembles them into a comprehensive
 * docs/grounding/vivian-index.json for CPRS parity triangulation.
 *
 * Data sources:
 *   - vivian-data/packages.json   -- Full hierarchical package tree (100+ packages)
 *   - vivian-data/8994.json       -- ALL Remote Procedure definitions (3,300+ RPCs)
 *   - vivian-data/pkgdep.json     -- Package dependency graph
 *   - vivian/scripts/PackageDes.json -- Package descriptions by namespace
 *
 * Output: docs/grounding/vivian-index.json
 *   - packages keyed by namespace prefix (backward-compatible with build_parity_matrix.ts)
 *   - rpcs: complete catalog with name, tag, routine, returnType, description, params
 *   - packageDependencies: inter-package dependency graph
 *   - _meta: generation stats
 *
 * Usage: npx tsx scripts/vivian_snapshot.ts
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const GROUNDING_DIR = join(ROOT, 'docs', 'grounding');
const CACHE_DIR = join(GROUNDING_DIR, 'vivian-dox-cache');
const OUTPUT_FILE = join(GROUNDING_DIR, 'vivian-index.json');

// Real Vivian data sources (WorldVistA)
const VIVIAN_DATA_BASE = 'https://vivian.worldvista.org/vivian-data';
const VIVIAN_SCRIPTS_BASE = 'https://vivian.worldvista.org/vivian/scripts';
const VIVIAN_DOX_BASE = 'https://vivian.worldvista.org/dox';

// ---- Fetch helpers ----

async function fetchJSON(url: string, label: string, timeoutMs = 60000): Promise<any | null> {
  const cachePath = join(CACHE_DIR, label + '.json');
  // Check cache first
  if (existsSync(cachePath)) {
    console.log(`  [cache] ${label}`);
    return JSON.parse(readFileSync(cachePath, 'utf-8'));
  }
  console.log(`  [fetch] ${url}`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      console.log(`  [warn] ${url} returned ${res.status}`);
      return null;
    }
    const text = await res.text();
    clearTimeout(timer);
    // Cache the raw text
    writeFileSync(cachePath, text);
    return JSON.parse(text);
  } catch (err: any) {
    clearTimeout(timer);
    console.log(`  [warn] fetch failed for ${label}: ${err.message}`);
    return null;
  }
}

// ---- Package tree flattening ----

interface VivianPackageNode {
  name: string;
  children?: VivianPackageNode[];
  Posprefixes?: string[];
  Negprefixes?: string[];
  des?: string;
  description?: string;
  interfaces?: string[];
  vdl?: string[];
  distribution?: string[];
  gui?: string;
  status?: string;
  hasLink?: boolean;
}

interface FlatPackage {
  name: string;
  namespaces: string[];
  description: string;
  interfaces: string[];
  hasRPC: boolean;
  hasHL7: boolean;
  vdlLinks: string[];
  distribution: string[];
  rpcCount: number;
  rpcs: string[];  // filled later from 8994
}

function flattenPackageTree(node: VivianPackageNode, result: FlatPackage[] = []): FlatPackage[] {
  if (node.Posprefixes && node.Posprefixes.length > 0) {
    // This is a leaf package node
    result.push({
      name: node.name,
      namespaces: node.Posprefixes || [],
      description: node.description || node.des || '',
      interfaces: node.interfaces || [],
      hasRPC: (node.interfaces || []).includes('RPC'),
      hasHL7: (node.interfaces || []).includes('HL7') || (node.interfaces || []).includes('HLO'),
      vdlLinks: node.vdl || [],
      distribution: node.distribution || [],
      rpcCount: 0,
      rpcs: [],
    });
  }
  if (node.children) {
    for (const child of node.children) {
      flattenPackageTree(child, result);
    }
  }
  return result;
}

// ---- RPC parsing from file 8994 ----

interface RpcEntry {
  ien: string;
  name: string;
  tag: string;
  routine: string;
  returnType: string;
  availability: string;
  inactive: string;
  wordWrap: boolean;
  version: string;
  appProxyAllowed: boolean;
  description: string;
  inputParams: Array<{ name: string; type: string; required: boolean; sequence: number; maxLength: number; description: string }>;
  returnDescription: string;
  package?: string;
}

function parseRpcFile(data: Record<string, any>): RpcEntry[] {
  const rpcs: RpcEntry[] = [];
  for (const [ien, fields] of Object.entries(data)) {
    if (!fields || typeof fields !== 'object') continue;
    const name = (fields['.01'] || '').replace(/^NAME:\s*/, '');
    if (!name) continue;

    const tag = (fields['.02'] || '').replace(/^TAG:\s*/, '');
    const routine = (fields['.03'] || '').replace(/^ROUTINE:\s*/, '');
    const returnType = (fields['.04'] || '').replace(/^RETURN VALUE TYPE:\s*/, '');
    const availability = (fields['.05'] || '').replace(/^AVAILABILITY:\s*/, '');
    const inactive = (fields['.06'] || '').replace(/^INACTIVE:\s*/, '');
    const wordWrap = (fields['.08'] || '').includes('TRUE');
    const version = (fields['.09'] || '').replace(/^VERSION:\s*/, '');
    const appProxy = (fields['.11'] || '').includes('Yes');

    // Parse description (field "1")
    let description = '';
    const descRaw = fields['1'] || '';
    if (typeof descRaw === 'string') {
      const arrMatch = descRaw.match(/DESCRIPTION:\s*\[([^\]]*)\]/);
      if (arrMatch) {
        try {
          // It's a Python-style string list, approximate parse
          description = arrMatch[1]
            .split("', '")
            .map((s: string) => s.replace(/^['"]|['"]$/g, '').trim())
            .join(' ')
            .substring(0, 500);
        } catch { description = ''; }
      }
    }

    // Parse input parameters (field "2") - extract names only for size
    const inputParams: RpcEntry['inputParams'] = [];
    const paramRaw = fields['2'] || '';
    if (typeof paramRaw === 'string') {
      // Extract INPUT PARAMETER names from the nested structure
      const paramNameMatches = paramRaw.matchAll(/INPUT PARAMETER:\s*([^,'"]+)/g);
      for (const m of paramNameMatches) {
        const pname = m[1].trim();
        if (pname && pname !== '8994.02') {
          inputParams.push({
            name: pname,
            type: '',
            required: paramRaw.includes("REQUIRED: YES"),
            sequence: 0,
            maxLength: 0,
            description: '',
          });
        }
      }
    }

    // Parse return description (field "3")
    let returnDescription = '';
    const retRaw = fields['3'] || '';
    if (typeof retRaw === 'string') {
      const retMatch = retRaw.match(/RETURN PARAMETER DESCRIPTION:\s*\[([^\]]*)\]/);
      if (retMatch) {
        try {
          returnDescription = retMatch[1]
            .split("', '")
            .map((s: string) => s.replace(/^['"]|['"]$/g, '').trim())
            .join(' ')
            .substring(0, 300);
        } catch { returnDescription = ''; }
      }
    }

    rpcs.push({
      ien,
      name,
      tag,
      routine,
      returnType,
      availability,
      inactive,
      wordWrap,
      version,
      appProxyAllowed: appProxy,
      description: sanitizeDescription(description),
      inputParams,
      returnDescription: sanitizeDescription(returnDescription),
    });
  }
  return rpcs;
}

// ---- Sanitize descriptions: strip SSN-like patterns from VistA doc examples ----
const SSN_PATTERN = /\d{3}-\d{2}-\d{4}/g;
function sanitizeDescription(text: string): string {
  return text.replace(SSN_PATTERN, '***-**-****');
}

// ---- Map RPCs to packages by routine namespace ----

function mapRpcToPackage(rpc: RpcEntry, pkgByPrefix: Map<string, FlatPackage>): string | undefined {
  // Try matching routine name prefix against package namespaces
  const routine = rpc.routine.toUpperCase();
  const rpcName = rpc.name.toUpperCase();

  // Sorted longest-prefix-first for correct matching
  const prefixes = [...pkgByPrefix.keys()].sort((a, b) => b.length - a.length);

  for (const prefix of prefixes) {
    if (routine.startsWith(prefix) || rpcName.startsWith(prefix)) {
      return prefix;
    }
  }
  return undefined;
}

// ---- Main ----

async function run() {
  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(GROUNDING_DIR, { recursive: true });

  console.log('[vivian] Comprehensive Vivian/DOX grounding snapshot');
  console.log(`[vivian] Data source: ${VIVIAN_DATA_BASE}`);

  // 1. Fetch packages.json (hierarchical package tree)
  console.log('\n[vivian] Step 1: Fetching package hierarchy...');
  const packagesTree = await fetchJSON(
    `${VIVIAN_DATA_BASE}/packages.json`,
    'packages'
  );

  // 2. Fetch 8994.json (ALL Remote Procedure definitions)
  console.log('\n[vivian] Step 2: Fetching RPC definitions (file 8994)...');
  const rpcData = await fetchJSON(
    `${VIVIAN_DATA_BASE}/8994.json`,
    '8994',
    120000  // 2 min timeout -- this file is huge
  );

  // 3. Fetch pkgdep.json (package dependencies)
  console.log('\n[vivian] Step 3: Fetching package dependencies...');
  const pkgDeps = await fetchJSON(
    `${VIVIAN_DATA_BASE}/pkgdep.json`,
    'pkgdep'
  );

  // 4. Fetch PackageDes.json (descriptions by namespace)
  console.log('\n[vivian] Step 4: Fetching package descriptions...');
  const pkgDescs = await fetchJSON(
    `${VIVIAN_SCRIPTS_BASE}/PackageDes.json`,
    'PackageDes'
  );

  // ---- Process packages ----
  console.log('\n[vivian] Processing package tree...');
  let flatPackages: FlatPackage[] = [];
  if (packagesTree) {
    flatPackages = flattenPackageTree(packagesTree);
    console.log(`  [info] ${flatPackages.length} packages found in hierarchy`);
  } else {
    console.log('  [warn] No packages.json available, continuing with RPC data only');
  }

  // Build prefix->package lookup
  const pkgByPrefix = new Map<string, FlatPackage>();
  for (const pkg of flatPackages) {
    for (const ns of pkg.namespaces) {
      pkgByPrefix.set(ns.toUpperCase(), pkg);
    }
  }

  // ---- Process RPCs ----
  console.log('\n[vivian] Processing RPC definitions...');
  let allRpcs: RpcEntry[] = [];
  if (rpcData) {
    allRpcs = parseRpcFile(rpcData);
    console.log(`  [info] ${allRpcs.length} RPCs parsed from file 8994`);

    // Map RPCs to packages
    let mapped = 0;
    for (const rpc of allRpcs) {
      const prefix = mapRpcToPackage(rpc, pkgByPrefix);
      if (prefix) {
        rpc.package = prefix;
        const pkg = pkgByPrefix.get(prefix);
        if (pkg) {
          pkg.rpcs.push(rpc.name);
          pkg.rpcCount++;
        }
        mapped++;
      }
    }
    console.log(`  [info] ${mapped}/${allRpcs.length} RPCs mapped to packages`);
  } else {
    console.log('  [warn] No 8994.json available');
  }

  // ---- Build backward-compatible packages index ----
  // Keyed by first namespace prefix (for build_parity_matrix.ts compatibility)
  const packagesIndex: Record<string, any> = {};
  for (const pkg of flatPackages) {
    const primaryPrefix = pkg.namespaces[0] || pkg.name;
    const entry = {
      name: pkg.name,
      prefix: primaryPrefix,
      namespaces: pkg.namespaces,
      description: pkg.description,
      interfaces: pkg.interfaces,
      hasRPC: pkg.hasRPC,
      hasHL7: pkg.hasHL7,
      rpcCount: pkg.rpcCount,
      rpcs: pkg.rpcs.sort(),
      vdlLinks: pkg.vdlLinks,
      distribution: pkg.distribution,
      vivianUrl: `${VIVIAN_DOX_BASE}/Package_${pkg.name.replace(/ /g, '_')}.html`,
    };
    packagesIndex[primaryPrefix] = entry;

    // Add all secondary namespace prefixes as aliases
    for (const ns of pkg.namespaces.slice(1)) {
      if (!packagesIndex[ns]) {
        packagesIndex[ns] = { ...entry, prefix: ns, _aliasOf: primaryPrefix };
      }
    }
  }

  // Backward-compat aliases for CPRS parity matrix (guessPackage uses these keys)
  const CPRS_ALIASES: Record<string, string> = {
    'GMR': 'GMRV',     // Vitals: parity matrix uses GMR, Vivian uses GMRV
    'GMRD': 'GMRA',    // Allergy tracking data
    'XUS': 'XU',       // Kernel sign-on
    'XUSRB': 'XU',     // Kernel XWB sign-on routines
    'DDR': 'DI',       // Data Dictionary -> VA FileMan
    'VE': 'OR',        // VistA-Evolved custom RPCs default to OR context
  };
  for (const [alias, target] of Object.entries(CPRS_ALIASES)) {
    if (!packagesIndex[alias] && packagesIndex[target]) {
      packagesIndex[alias] = { ...packagesIndex[target], prefix: alias, _aliasOf: target };
    }
  }

  // ---- Build compact RPC catalog ----
  // Full detail for every RPC (name, tag, routine, returnType, availability, description, params)
  const rpcCatalog = allRpcs.map(r => ({
    name: r.name,
    tag: r.tag,
    routine: r.routine,
    returnType: r.returnType,
    availability: r.availability || '',
    inactive: r.inactive || '',
    appProxyAllowed: r.appProxyAllowed,
    description: r.description,
    inputParams: r.inputParams.map(p => p.name),
    returnDescription: r.returnDescription,
    package: r.package || '',
  }));

  // ---- Build package dependency map ----
  let dependencyMap: Record<string, string[]> = {};
  if (pkgDeps && typeof pkgDeps === 'object') {
    dependencyMap = pkgDeps;
    console.log(`  [info] ${Object.keys(dependencyMap).length} package dependency entries`);
  }

  // ---- Stats ----
  const rpcPackages = new Set(allRpcs.filter(r => r.package).map(r => r.package));
  const activeRpcs = allRpcs.filter(r => !r.inactive || r.inactive === 'ACTIVE');
  const publicRpcs = allRpcs.filter(r => r.availability === 'PUBLIC');
  const restrictedRpcs = allRpcs.filter(r => r.availability === 'RESTRICTED');
  const subscribedRpcs = allRpcs.filter(r => r.availability === 'SUBSCRIPTION');

  // ---- Output ----
  const output = {
    _meta: {
      generatedAt: new Date().toISOString(),
      description: 'Comprehensive VistA package + RPC index from WorldVistA Vivian/DOX',
      vivianDataSource: VIVIAN_DATA_BASE,
      vivianDoxBase: VIVIAN_DOX_BASE,
      packageCount: flatPackages.length,
      packagesWithRPC: flatPackages.filter(p => p.hasRPC).length,
      packagesWithHL7: flatPackages.filter(p => p.hasHL7).length,
      totalRpcs: allRpcs.length,
      activeRpcs: activeRpcs.length,
      publicRpcs: publicRpcs.length,
      restrictedRpcs: restrictedRpcs.length,
      subscribedRpcs: subscribedRpcs.length,
      rpcPackagesCovered: rpcPackages.size,
      dependencyEntries: Object.keys(dependencyMap).length,
    },
    packages: packagesIndex,
    rpcs: rpcCatalog,
    packageDependencies: dependencyMap,
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');
  const fileSizeMB = (Buffer.byteLength(JSON.stringify(output, null, 2)) / 1024 / 1024).toFixed(1);
  console.log(`\n[vivian] Wrote ${OUTPUT_FILE} (${fileSizeMB} MB)`);
  console.log(`[vivian] ${flatPackages.length} packages, ${allRpcs.length} RPCs, ${Object.keys(dependencyMap).length} dependency entries`);
  console.log(`[vivian] RPC breakdown: ${activeRpcs.length} active, ${publicRpcs.length} public, ${restrictedRpcs.length} restricted, ${subscribedRpcs.length} subscription`);
}

run().catch(err => {
  console.error('[vivian] Fatal error:', err.message);
  process.exit(1);
});
