#!/usr/bin/env node
/**
 * build-route-rpc-map.mjs  --  Phase 216: Route-to-RPC Map Generator
 *
 * Scans all Fastify route files, extracts HTTP route registrations,
 * and maps each route to the VistA RPCs it calls. Cross-references
 * with rpcRegistry.ts for domain/tag metadata.
 *
 * Outputs:
 *   - docs/vista-alignment/route-rpc-map.json   (machine-readable)
 *   - docs/vista-alignment/route-rpc-map.md     (human-readable)
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const API_SRC = join(ROOT, 'apps', 'api', 'src');
const OUT_DIR = join(ROOT, 'docs', 'vista-alignment');

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function readJsonFile(path) {
  let raw = readFileSync(path, 'utf8');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  return JSON.parse(raw);
}

function walkTs(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
      results.push(...walkTs(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      results.push(full);
    }
  }
  return results;
}

/* ------------------------------------------------------------------ */
/* Step 1: Parse RPC Registry                                          */
/* ------------------------------------------------------------------ */

function parseRpcRegistry() {
  const registryPath = join(API_SRC, 'vista', 'rpcRegistry.ts');
  const src = readFileSync(registryPath, 'utf8');

  const registry = new Map();

  // Parse RPC_REGISTRY entries: { name: "...", domain: "...", tag: "...", description: "..." }
  const regRe =
    /\{\s*name:\s*["']([^"']+)["']\s*,\s*domain:\s*["']([^"']+)["']\s*,\s*tag:\s*["']([^"']+)["']/g;
  let m;
  while ((m = regRe.exec(src)) !== null) {
    registry.set(m[1], { domain: m[2], tag: m[3], isException: false });
  }

  // Parse RPC_EXCEPTIONS: { name: "...", reason: "..." }
  const excRe = /\{\s*name:\s*["']([^"']+)["']\s*,\s*reason:\s*["']([^"']+)["']/g;
  while ((m = excRe.exec(src)) !== null) {
    if (!registry.has(m[1])) {
      registry.set(m[1], { domain: 'exception', tag: 'custom', isException: true, reason: m[2] });
    }
  }

  return registry;
}

/* ------------------------------------------------------------------ */
/* Step 2: Extract routes and their RPC calls                          */
/* ------------------------------------------------------------------ */

function extractRoutesFromFile(filePath, rpcRegistry) {
  const src = readFileSync(filePath, 'utf8');
  const lines = src.split('\n');
  const relPath = relative(ROOT, filePath).replace(/\\/g, '/');

  const routes = [];

  // Match Fastify route patterns:
  // server.get('/path', ..., async (request, reply) => { ... })
  // server.post('/path', ..., async (request, reply) => { ... })
  // Also: fastify.get, app.get, etc.
  const routeRe =
    /(?:server|fastify|app|instance)\s*\.\s*(get|post|put|delete|patch)\s*\(\s*["'`]([^"'`]+)["'`]/gi;

  let routeMatch;
  while ((routeMatch = routeRe.exec(src)) !== null) {
    const method = routeMatch[1].toUpperCase();
    const path = routeMatch[2];
    const routeStartLine = src.substring(0, routeMatch.index).split('\n').length;

    // Find the handler scope: from route registration to next route or end
    const nextRouteRe =
      /(?:server|fastify|app|instance)\s*\.\s*(?:get|post|put|delete|patch)\s*\(/gi;
    nextRouteRe.lastIndex = routeMatch.index + routeMatch[0].length;
    const nextMatch = nextRouteRe.exec(src);
    const handlerEnd = nextMatch ? nextMatch.index : src.length;
    const handlerSrc = src.substring(routeMatch.index, handlerEnd);

    // Extract RPC names from the handler scope
    const rpcs = extractRpcCalls(handlerSrc, rpcRegistry);

    routes.push({
      method,
      path,
      sourceFile: relPath,
      line: routeStartLine,
      rpcs,
      rpcCount: rpcs.length,
      isStub:
        handlerSrc.includes('integration-pending') ||
        handlerSrc.includes('"ok":false') ||
        handlerSrc.includes('ok: false'),
    });
  }

  return routes;
}

function extractRpcCalls(handlerSrc, rpcRegistry) {
  const rpcs = new Set();

  // Match string literals that look like RPC names (all-caps words with spaces)
  // Pattern 1: safeCallRpc("RPC NAME")
  // Pattern 2: callRpc("RPC NAME")
  // Pattern 3: safeCallRpcWithList("RPC NAME")
  const callRe =
    /(?:safeCallRpc|callRpc|safeCallRpcWithList|cachedRpc|resilientRpc)\s*\(\s*["'`]([^"'`]+)["'`]/g;
  let m;
  while ((m = callRe.exec(handlerSrc)) !== null) {
    rpcs.add(m[1]);
  }

  // Pattern 4: RPC name in a variable assignment then used in callRpc
  // e.g., const rpcName = "ORWPS ACTIVE"; ... callRpc(rpcName, ...)
  // This is hard to do statically -- look for string constants that match known RPCs
  for (const rpcName of rpcRegistry.keys()) {
    // Check if the RPC name appears as a string literal in the handler
    if (handlerSrc.includes(`"${rpcName}"`) || handlerSrc.includes(`'${rpcName}'`)) {
      // Only add if there's also a callRpc-like function nearby
      if (/(?:safeCallRpc|callRpc|safeCallRpcWithList|cachedRpc|resilientRpc)/.test(handlerSrc)) {
        rpcs.add(rpcName);
      }
    }
  }

  return [...rpcs].sort().map((name) => {
    const meta = rpcRegistry.get(name);
    return {
      name,
      domain: meta?.domain || 'unknown',
      tag: meta?.tag || 'unknown',
      registered: !!meta,
      isException: meta?.isException || false,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Step 3: Scan service files for indirect RPC calls                   */
/* ------------------------------------------------------------------ */

function extractServiceRpcMap(rpcRegistry) {
  const serviceFiles = walkTs(join(API_SRC, 'services')).concat(walkTs(join(API_SRC, 'adapters')));

  const serviceRpcs = new Map(); // file -> rpcs[]

  for (const file of serviceFiles) {
    const src = readFileSync(file, 'utf8');
    const relPath = relative(ROOT, file).replace(/\\/g, '/');
    const rpcs = extractRpcCalls(src, rpcRegistry);
    if (rpcs.length > 0) {
      serviceRpcs.set(relPath, rpcs);
    }
  }

  return serviceRpcs;
}

/* ------------------------------------------------------------------ */
/* Step 4: Build and output the map                                    */
/* ------------------------------------------------------------------ */

function main() {
  console.log('=== Route-RPC Map Generator (Phase 216) ===\n');

  // Parse registry
  const rpcRegistry = parseRpcRegistry();
  console.log(`  RPC Registry: ${rpcRegistry.size} entries`);

  // Scan route files
  const routeDirs = [
    join(API_SRC, 'routes'),
    join(API_SRC, 'routes', 'cprs'),
    join(API_SRC, 'routes', 'scheduling'),
  ];

  const allRoutes = [];
  const scannedFiles = new Set();

  for (const dir of routeDirs) {
    if (!existsSync(dir)) continue;
    const tsFiles = walkTs(dir);
    for (const file of tsFiles) {
      if (scannedFiles.has(file)) continue;
      scannedFiles.add(file);
      const routes = extractRoutesFromFile(file, rpcRegistry);
      allRoutes.push(...routes);
    }
  }

  // Also scan top-level route files registered directly in index.ts
  const topRoutes = readdirSync(API_SRC).filter((f) => f.endsWith('.ts'));
  for (const f of topRoutes) {
    const full = join(API_SRC, f);
    if (scannedFiles.has(full)) continue;
    scannedFiles.add(full);
    const routes = extractRoutesFromFile(full, rpcRegistry);
    allRoutes.push(...routes);
  }

  // Service-layer RPC map (indirect calls)
  const serviceRpcs = extractServiceRpcMap(rpcRegistry);

  // Sort routes by path
  allRoutes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

  // Build summary
  const totalRoutes = allRoutes.length;
  const routesWithRpcs = allRoutes.filter((r) => r.rpcCount > 0).length;
  const stubRoutes = allRoutes.filter((r) => r.isStub).length;
  const allRpcNames = new Set();
  for (const r of allRoutes) {
    for (const rpc of r.rpcs) allRpcNames.add(rpc.name);
  }
  const unregistered = [...allRpcNames].filter((n) => !rpcRegistry.has(n));

  console.log(`  Routes found: ${totalRoutes}`);
  console.log(`  Routes with live RPCs: ${routesWithRpcs}`);
  console.log(`  Stub routes: ${stubRoutes}`);
  console.log(`  Unique RPCs in routes: ${allRpcNames.size}`);
  console.log(`  Service files with RPCs: ${serviceRpcs.size}`);
  if (unregistered.length > 0) {
    console.log(`  WARNING: ${unregistered.length} unregistered RPCs: ${unregistered.join(', ')}`);
  }

  // Build output JSON
  const output = {
    _meta: {
      generatedAt: new Date().toISOString(),
      tool: 'tools/rpc-extract/build-route-rpc-map.mjs',
      summary: {
        totalRoutes,
        routesWithRpcs,
        stubRoutes,
        uniqueRpcsInRoutes: allRpcNames.size,
        serviceFilesWithRpcs: serviceRpcs.size,
        unregisteredRpcs: unregistered,
      },
    },
    routes: allRoutes,
    serviceRpcs: Object.fromEntries(serviceRpcs),
  };

  // Write JSON
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const jsonPath = join(OUT_DIR, 'route-rpc-map.json');
  writeFileSync(jsonPath, JSON.stringify(output, null, 2) + '\n');
  console.log(`\n  Written: ${relative(ROOT, jsonPath)}`);

  // Write Markdown
  const mdPath = join(OUT_DIR, 'route-rpc-map.md');
  writeFileSync(mdPath, generateMarkdown(output));
  console.log(`  Written: ${relative(ROOT, mdPath)}`);
}

function generateMarkdown(data) {
  const lines = [
    '# Route-to-RPC Map',
    '',
    `> Generated: ${data._meta.generatedAt}`,
    `> Tool: \`${data._meta.tool}\``,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total routes | ${data._meta.summary.totalRoutes} |`,
    `| Routes with live RPCs | ${data._meta.summary.routesWithRpcs} |`,
    `| Stub routes | ${data._meta.summary.stubRoutes} |`,
    `| Unique RPCs in routes | ${data._meta.summary.uniqueRpcsInRoutes} |`,
    `| Service files with RPCs | ${data._meta.summary.serviceFilesWithRpcs} |`,
    '',
    '## Routes with Live RPC Calls',
    '',
  ];

  const liveRoutes = data.routes.filter((r) => r.rpcCount > 0 && !r.isStub);
  for (const r of liveRoutes) {
    lines.push(`### ${r.method} \`${r.path}\``);
    lines.push(`- **Source**: \`${r.sourceFile}:${r.line}\``);
    lines.push(`- **RPCs** (${r.rpcCount}):`);
    for (const rpc of r.rpcs) {
      const reg = rpc.registered ? '' : ' **UNREGISTERED**';
      lines.push(`  - \`${rpc.name}\` (${rpc.domain}/${rpc.tag})${reg}`);
    }
    lines.push('');
  }

  lines.push('## Stub Routes (integration-pending)');
  lines.push('');
  const stubs = data.routes.filter((r) => r.isStub);
  if (stubs.length === 0) {
    lines.push('None.');
  } else {
    lines.push('| Method | Path | Source |');
    lines.push('|--------|------|--------|');
    for (const r of stubs) {
      lines.push(`| ${r.method} | \`${r.path}\` | \`${r.sourceFile}\` |`);
    }
  }
  lines.push('');

  lines.push('## Service-Layer RPC Calls (indirect)');
  lines.push('');
  for (const [file, rpcs] of Object.entries(data.serviceRpcs)) {
    lines.push(`### \`${file}\``);
    for (const rpc of rpcs) {
      lines.push(`- \`${rpc.name}\` (${rpc.domain}/${rpc.tag})`);
    }
    lines.push('');
  }

  if (data._meta.summary.unregisteredRpcs.length > 0) {
    lines.push('## Unregistered RPCs (ALERT)');
    lines.push('');
    for (const rpc of data._meta.summary.unregisteredRpcs) {
      lines.push(`- \`${rpc}\``);
    }
    lines.push('');
  }

  return lines.join('\n') + '\n';
}

main();
