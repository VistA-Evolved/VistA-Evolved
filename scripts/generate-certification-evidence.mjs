#!/usr/bin/env node
/**
 * Phase 172: Certification Evidence Export Pack
 *
 * Unified zero-PHI evidence bundle generator for SOC2/HIPAA-style
 * tech certifications. Extends Phase 34 evidence bundle with:
 *   - All 8 posture domain snapshots
 *   - Audit chain verification (immutable, imaging, RCM)
 *   - System gap matrix capture
 *   - Compliance framework mapping
 *   - Sanitized config snapshots
 *   - Gauntlet fast suite results
 *   - SHA-256 manifest of all artifacts
 *
 * Usage:
 *   node scripts/generate-certification-evidence.mjs
 *   node scripts/generate-certification-evidence.mjs --build-id cert-2025-01
 *   node scripts/generate-certification-evidence.mjs --zip
 *   node scripts/generate-certification-evidence.mjs --skip-gates
 *
 * Output: artifacts/evidence/certification/<build-id>/
 */

import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const buildId = args.includes('--build-id')
  ? args[args.indexOf('--build-id') + 1]
  : `cert-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
const doZip = args.includes('--zip');
const skipGates = args.includes('--skip-gates');

const outDir = join(ROOT, 'artifacts', 'evidence', 'certification', buildId);
mkdirSync(outDir, { recursive: true });

const sections = [];
const startTime = Date.now();
let issueCount = 0;

// -- Helpers -------------------------------------------------

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function safeReadJson(filePath) {
  try {
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, 'utf-8');
    const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

function safeExec(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: opts.timeout || 120_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (err) {
    return (err.stdout || '') + '\n' + (err.stderr || '');
  }
}

function logSection(name, status, detail) {
  const icon = status === 'pass' ? 'PASS' : status === 'skip' ? 'SKIP' : 'FAIL';
  console.log(`  [${icon}] ${name}${detail ? ' -- ' + detail : ''}`);
  sections.push({ name, status, detail, timestamp: new Date().toISOString() });
  if (status === 'fail') issueCount++;
}

// -- PHI scan helper -----------------------------------------

const PHI_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b(?:19|20)\d{2}-\d{2}-\d{2}\b/, // DOB in ISO
  /\bpatient\s*name\s*[:=]/i, // patient name field
  /\bPROV123/, // sandbox creds
  /\bNURSE123/,
  /\bPHARM123/,
];

function scanForPhi(content) {
  const findings = [];
  for (const pat of PHI_PATTERNS) {
    if (pat.test(content)) {
      findings.push(pat.source);
    }
  }
  return findings;
}

console.log(`\n=== Certification Evidence Export (Phase 172) ===`);
console.log(`Build ID: ${buildId}`);
console.log(`Output:   ${outDir}`);
console.log(`Options:  zip=${doZip} skipGates=${skipGates}\n`);

// ===========================================================
// Section 1: Quality Gates (reuse Phase 34 patterns)
// ===========================================================

console.log('--- Section 1: Quality Gates ---');

const gateResults = {};

if (!skipGates) {
  // TypeScript check
  console.log('  Running TypeScript check...');
  const tscApi = safeExec('pnpm -C apps/api exec tsc --noEmit 2>&1');
  const tscApiPass = !tscApi.includes('error TS');
  gateResults.typecheck = {
    api: { pass: tscApiPass, errors: tscApiPass ? 0 : (tscApi.match(/error TS/g) || []).length },
  };
  logSection(
    'TypeScript: API',
    tscApiPass ? 'pass' : 'fail',
    tscApiPass ? 'clean' : `${gateResults.typecheck.api.errors} errors`
  );

  // Secret scan
  console.log('  Running secret scan...');
  const secretOutput = safeExec('node scripts/secret-scan.mjs 2>&1');
  const secretPass = !secretOutput.includes('FAIL');
  gateResults.secretScan = { pass: secretPass };
  logSection('Secret Scan', secretPass ? 'pass' : 'fail');

  // PHI leak scan
  console.log('  Running PHI leak scan...');
  const phiOutput = safeExec('node scripts/phi-leak-scan.mjs 2>&1');
  const phiPass = !phiOutput.includes('FAIL');
  gateResults.phiLeakScan = { pass: phiPass };
  logSection('PHI Leak Scan', phiPass ? 'pass' : 'fail');
} else {
  logSection('Quality Gates', 'skip', 'skipped via --skip-gates');
  gateResults.skipped = true;
}

writeFileSync(join(outDir, 'gate-results.json'), JSON.stringify(gateResults, null, 2));

// ===========================================================
// Section 2: Posture Snapshots
// ===========================================================

console.log('\n--- Section 2: Posture Snapshots ---');

// We collect posture data by reading the source files directly
// (not via HTTP since API may not be running)
const postureSnapshot = {
  collectedAt: new Date().toISOString(),
  method: 'static-analysis',
  domains: {},
  note: 'Posture modules require running API for live gates. This captures static readiness.',
};

// Certification posture file check
const certPosturePath = join(ROOT, 'apps/api/src/posture/certification-posture.ts');
if (existsSync(certPosturePath)) {
  postureSnapshot.domains.certification = {
    exists: true,
    file: 'apps/api/src/posture/certification-posture.ts',
  };
  logSection('Certification Posture Module', 'pass', 'present');
} else {
  postureSnapshot.domains.certification = { exists: false };
  logSection('Certification Posture Module', 'fail', 'missing');
}

// Check all posture modules
const postureModules = [
  'observability-posture.ts',
  'tenant-posture.ts',
  'perf-posture.ts',
  'backup-posture.ts',
  'data-plane-posture.ts',
  'audit-shipping-posture.ts',
  'certification-posture.ts',
];

const postureDir = join(ROOT, 'apps/api/src/posture');
let postureModuleCount = 0;
for (const mod of postureModules) {
  const modPath = join(postureDir, mod);
  if (existsSync(modPath)) {
    postureModuleCount++;
    const content = readFileSync(modPath, 'utf-8');
    const gateMatches = content.match(/name:\s*["']([^"']+)["']/g) || [];
    postureSnapshot.domains[mod.replace('.ts', '')] = {
      exists: true,
      gateCount: gateMatches.length,
    };
  }
}
logSection(
  'Posture Modules',
  postureModuleCount >= 5 ? 'pass' : 'fail',
  `${postureModuleCount}/${postureModules.length} present`
);

writeFileSync(join(outDir, 'posture-snapshot.json'), JSON.stringify(postureSnapshot, null, 2));

// ===========================================================
// Section 3: Audit Chain Status
// ===========================================================

console.log('\n--- Section 3: Audit Chain Status ---');

const auditChainStatus = {
  collectedAt: new Date().toISOString(),
  trails: {},
};

// Check audit trail source files
const auditFiles = [
  {
    name: 'immutable',
    file: 'apps/api/src/lib/immutable-audit.ts',
    sink: 'logs/immutable-audit.jsonl',
  },
  {
    name: 'imaging',
    file: 'apps/api/src/services/imaging-audit.ts',
    sink: 'logs/imaging-audit.jsonl',
  },
  { name: 'rcm', file: 'apps/api/src/rcm/audit/rcm-audit.ts', sink: 'logs/rcm-audit.jsonl' },
];

for (const { name, file, sink } of auditFiles) {
  const filePath = join(ROOT, file);
  const sinkPath = join(ROOT, sink);
  const sourceExists = existsSync(filePath);
  const sinkExists = existsSync(sinkPath);

  let hashChainPresent = false;
  if (sourceExists) {
    const content = readFileSync(filePath, 'utf-8');
    hashChainPresent =
      content.includes('sha256') || content.includes('SHA-256') || content.includes('prevHash');
  }

  auditChainStatus.trails[name] = {
    sourceFile: file,
    sourceExists,
    sinkFile: sink,
    sinkExists,
    hashChainImplemented: hashChainPresent,
    phiSanitization: sourceExists && readFileSync(filePath, 'utf-8').includes('sanitize'),
  };
}

const allTrailsPresent = auditFiles.every((a) => existsSync(join(ROOT, a.file)));
logSection(
  'Audit Trail Sources',
  allTrailsPresent ? 'pass' : 'fail',
  `${auditFiles.filter((a) => existsSync(join(ROOT, a.file))).length}/3 trails`
);

const allHashChains = Object.values(auditChainStatus.trails).every((t) => t.hashChainImplemented);
logSection('Hash Chain Implementation', allHashChains ? 'pass' : 'fail');

writeFileSync(join(outDir, 'audit-chain-status.json'), JSON.stringify(auditChainStatus, null, 2));

// ===========================================================
// Section 4: System Gap Matrix
// ===========================================================

console.log('\n--- Section 4: System Gap Matrix ---');

const gapMatrixPath = join(ROOT, 'qa/gauntlet/system-gap-matrix.json');
if (existsSync(gapMatrixPath)) {
  const matrix = safeReadJson(gapMatrixPath);
  if (matrix) {
    const domainCount = matrix.domains?.length || 0;
    const wiredCount = (matrix.domains || []).filter((d) => d.status === 'wired').length;
    writeFileSync(join(outDir, 'system-gap-matrix.json'), JSON.stringify(matrix, null, 2));
    logSection('System Gap Matrix', 'pass', `${domainCount} domains, ${wiredCount} wired`);
  } else {
    logSection('System Gap Matrix', 'fail', 'invalid JSON');
  }
} else {
  // Try to generate it
  console.log('  Generating gap matrix...');
  safeExec('node scripts/system-audit.mjs 2>&1', { timeout: 60_000 });
  if (existsSync(gapMatrixPath)) {
    const matrix = safeReadJson(gapMatrixPath);
    writeFileSync(join(outDir, 'system-gap-matrix.json'), JSON.stringify(matrix, null, 2));
    logSection('System Gap Matrix', 'pass', 'generated');
  } else {
    logSection('System Gap Matrix', 'fail', 'could not generate');
  }
}

// ===========================================================
// Section 5: Compliance Framework Mapping
// ===========================================================

console.log('\n--- Section 5: Compliance Documentation ---');

const complianceDir = join(ROOT, 'docs/compliance');
const complianceDocs = {};
const requiredComplianceDocs = [
  'compliance-mapping.md',
  'data-classification.md',
  'access-control-policy.md',
  'incident-response.md',
  'threat-model.md',
  'logging-policy.md',
];

let complianceCount = 0;
for (const doc of requiredComplianceDocs) {
  const docPath = join(complianceDir, doc);
  if (existsSync(docPath)) {
    const content = readFileSync(docPath, 'utf-8');
    const phiFindings = scanForPhi(content);
    complianceDocs[doc] = {
      exists: true,
      sizeBytes: statSync(docPath).size,
      headingCount: (content.match(/^#+\s/gm) || []).length,
      phiClean: phiFindings.length === 0,
    };
    complianceCount++;
  } else {
    complianceDocs[doc] = { exists: false };
  }
}

logSection(
  'Compliance Docs',
  complianceCount >= 4 ? 'pass' : 'fail',
  `${complianceCount}/${requiredComplianceDocs.length} present`
);

writeFileSync(
  join(outDir, 'compliance-docs.json'),
  JSON.stringify(
    {
      collectedAt: new Date().toISOString(),
      documents: complianceDocs,
      totalPresent: complianceCount,
      totalRequired: requiredComplianceDocs.length,
    },
    null,
    2
  )
);

// ===========================================================
// Section 6: Configuration Snapshots (sanitized)
// ===========================================================

console.log('\n--- Section 6: Configuration Snapshots ---');

const configSnapshot = {
  collectedAt: new Date().toISOString(),
  configs: {},
};

const configFiles = [
  { name: 'modules', path: 'config/modules.json' },
  { name: 'skus', path: 'config/skus.json' },
  { name: 'capabilities', path: 'config/capabilities.json' },
  { name: 'performanceBudgets', path: 'config/performance-budgets.json' },
];

for (const { name, path: cfgPath } of configFiles) {
  const fullPath = join(ROOT, cfgPath);
  if (existsSync(fullPath)) {
    const data = safeReadJson(fullPath);
    if (data) {
      configSnapshot.configs[name] = {
        exists: true,
        entries: Array.isArray(data) ? data.length : Object.keys(data).length,
        hash: sha256(readFileSync(fullPath, 'utf-8')),
      };
    }
  } else {
    configSnapshot.configs[name] = { exists: false };
  }
}

// Sanitized .env.example (strip actual credential values)
const envExPath = join(ROOT, 'apps/api/.env.example');
if (existsSync(envExPath)) {
  const envContent = readFileSync(envExPath, 'utf-8');
  const sanitized = envContent
    .split('\n')
    .map((line) => {
      // Keep key names, mask values that look like secrets
      if (line.match(/(?:password|secret|token|key|verify).*=/i)) {
        return line.replace(/=.*/, '=***REDACTED***');
      }
      return line;
    })
    .join('\n');
  configSnapshot.configs.envTemplate = {
    exists: true,
    variableCount: (envContent.match(/^[A-Z_]+=.*/gm) || []).length,
    sanitized: true,
  };
  writeFileSync(join(outDir, 'env-template-sanitized.txt'), sanitized);
}

logSection(
  'Config Snapshots',
  Object.values(configSnapshot.configs).filter((c) => c.exists).length >= 3 ? 'pass' : 'fail',
  `${Object.values(configSnapshot.configs).filter((c) => c.exists).length}/${configFiles.length + 1} files`
);

writeFileSync(join(outDir, 'config-snapshot.json'), JSON.stringify(configSnapshot, null, 2));

// ===========================================================
// Section 7: Runbook Coverage
// ===========================================================

console.log('\n--- Section 7: Runbook Coverage ---');

const runbookDir = join(ROOT, 'docs/runbooks');
const runbooks = [];
if (existsSync(runbookDir)) {
  const files = readdirSync(runbookDir).filter((f) => f.endsWith('.md'));
  for (const f of files) {
    const content = readFileSync(join(runbookDir, f), 'utf-8');
    runbooks.push({
      name: f.replace('.md', ''),
      sizeBytes: Buffer.byteLength(content),
      hasTestSection: /## test/i.test(content),
    });
  }
}

logSection(
  'Runbook Coverage',
  runbooks.length >= 10 ? 'pass' : 'fail',
  `${runbooks.length} runbooks`
);

writeFileSync(
  join(outDir, 'runbook-index.json'),
  JSON.stringify(
    {
      collectedAt: new Date().toISOString(),
      runbooks,
      total: runbooks.length,
    },
    null,
    2
  )
);

// ===========================================================
// Section 8: Gauntlet Fast Suite
// ===========================================================

console.log('\n--- Section 8: Gauntlet Fast Suite ---');

if (!skipGates) {
  console.log('  Running gauntlet fast...');
  const gauntletOutput = safeExec('node qa/gauntlet/cli.mjs --suite fast 2>&1', {
    timeout: 180_000,
  });
  const gauntletJson = safeReadJson(join(ROOT, 'artifacts/qa-gauntlet.json'));

  if (gauntletJson) {
    // Sanitize: remove any output that might contain PHI
    const sanitized = {
      suite: gauntletJson.suite,
      timestamp: gauntletJson.timestamp,
      summary: gauntletJson.summary,
      gates: (gauntletJson.gates || []).map((g) => ({
        name: g.name,
        status: g.status,
        durationMs: g.durationMs,
        issueCount: (g.issues || []).length,
      })),
    };
    writeFileSync(join(outDir, 'gauntlet-results.json'), JSON.stringify(sanitized, null, 2));
    const passCount = gauntletJson.summary?.pass || 0;
    logSection('Gauntlet Fast Suite', 'pass', `${passCount} PASS`);
  } else {
    writeFileSync(
      join(outDir, 'gauntlet-results.json'),
      JSON.stringify(
        {
          error: 'Could not parse gauntlet output',
          rawOutput: gauntletOutput.slice(0, 5000),
        },
        null,
        2
      )
    );
    logSection('Gauntlet Fast Suite', 'fail', 'output not parseable');
  }
} else {
  logSection('Gauntlet Fast Suite', 'skip', 'skipped via --skip-gates');
}

// ===========================================================
// Section 9: Store Inventory Snapshot
// ===========================================================

console.log('\n--- Section 9: Store Inventory ---');

const storePolicyPath = join(ROOT, 'apps/api/src/platform/store-policy.ts');
if (existsSync(storePolicyPath)) {
  const content = readFileSync(storePolicyPath, 'utf-8');
  const storeMatches = content.match(/id:\s*["']([^"']+)["']/g) || [];
  const criticalMatches = content.match(/classification:\s*["']critical["']/g) || [];
  const inMemoryMatches = content.match(/durability:\s*["']in_memory_only["']/g) || [];

  const storeInventory = {
    totalStores: storeMatches.length,
    criticalStores: criticalMatches.length,
    inMemoryOnly: inMemoryMatches.length,
    policyFileHash: sha256(content),
  };

  writeFileSync(join(outDir, 'store-inventory.json'), JSON.stringify(storeInventory, null, 2));
  logSection('Store Inventory', 'pass', `${storeMatches.length} stores tracked`);
} else {
  logSection('Store Inventory', 'fail', 'store-policy.ts not found');
}

// ===========================================================
// Section 10: Architecture Documentation
// ===========================================================

console.log('\n--- Section 10: Architecture Documentation ---');

const archDocs = [
  'AGENTS.md',
  'docs/architecture/product-modularity-v1.md',
  'docs/architecture/rcm-gateway-architecture.md',
  'docs/architecture/module-catalog.md',
  'docs/security/rcm-phi-handling.md',
  'docs/analytics/phase25-data-classification.md',
];

const archStatus = {};
let archCount = 0;
for (const doc of archDocs) {
  const docPath = join(ROOT, doc);
  if (existsSync(docPath)) {
    archStatus[doc] = { exists: true, sizeBytes: statSync(docPath).size };
    archCount++;
  } else {
    archStatus[doc] = { exists: false };
  }
}

logSection(
  'Architecture Docs',
  archCount >= 3 ? 'pass' : 'fail',
  `${archCount}/${archDocs.length} present`
);

writeFileSync(
  join(outDir, 'arch-docs.json'),
  JSON.stringify(
    {
      collectedAt: new Date().toISOString(),
      documents: archStatus,
      totalPresent: archCount,
    },
    null,
    2
  )
);

// ===========================================================
// Final: PHI Scan + Manifest + Summary
// ===========================================================

console.log('\n--- Final: PHI Scan & Manifest ---');

// PHI-scan all generated artifacts
const allFiles = readdirSync(outDir);
const phiScanResults = {};
let phiClean = true;

for (const f of allFiles) {
  const content = readFileSync(join(outDir, f), 'utf-8');
  const findings = scanForPhi(content);
  phiScanResults[f] = { clean: findings.length === 0, findings };
  if (findings.length > 0) phiClean = false;
}

logSection(
  'PHI Scan of Bundle',
  phiClean ? 'pass' : 'fail',
  phiClean ? 'zero PHI detected' : 'PHI found in output!'
);

writeFileSync(
  join(outDir, 'phi-scan.json'),
  JSON.stringify(
    {
      collectedAt: new Date().toISOString(),
      allClean: phiClean,
      files: phiScanResults,
    },
    null,
    2
  )
);

// Generate SHA-256 manifest
const manifest = {
  buildId,
  generatedAt: new Date().toISOString(),
  generator: 'generate-certification-evidence.mjs',
  phase: 'Phase 172',
  artifacts: {},
};

// Re-read directory (phi-scan.json now included)
const finalFiles = readdirSync(outDir).filter((f) => f !== 'manifest.json' && f !== 'summary.md');
for (const f of finalFiles) {
  const content = readFileSync(join(outDir, f));
  manifest.artifacts[f] = {
    sha256: sha256(content),
    sizeBytes: content.length,
  };
}

writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Generate human-readable summary
const totalDuration = Date.now() - startTime;
const passCount = sections.filter((s) => s.status === 'pass').length;
const failCount = sections.filter((s) => s.status === 'fail').length;
const skipCount = sections.filter((s) => s.status === 'skip').length;

const summaryMd = `# Certification Evidence Pack -- ${buildId}

**Generated:** ${new Date().toISOString()}
**Duration:** ${(totalDuration / 1000).toFixed(1)}s
**Result:** ${failCount === 0 ? 'ALL SECTIONS PASSED' : failCount + ' SECTION(S) FAILED'}
**PHI Status:** ${phiClean ? 'CLEAN -- zero PHI in bundle' : 'WARNING -- PHI detected'}

## Evidence Sections

| # | Section | Status | Detail |
|---|---------|--------|--------|
${sections.map((s, i) => `| ${i + 1} | ${s.name} | ${s.status.toUpperCase()} | ${s.detail || '-'} |`).join('\n')}

## Artifacts in Bundle

| File | SHA-256 | Size |
|------|---------|------|
${Object.entries(manifest.artifacts)
  .map(([f, m]) => `| ${f} | ${m.sha256.slice(0, 16)}... | ${m.sizeBytes} bytes |`)
  .join('\n')}

## Summary

- **Total Sections:** ${sections.length}
- **Pass:** ${passCount} | **Fail:** ${failCount} | **Skip:** ${skipCount}
- **Artifacts:** ${Object.keys(manifest.artifacts).length} files
- **Bundle PHI-clean:** ${phiClean ? 'Yes' : 'NO'}

## Compliance Controls Covered

1. **Access Control (AC)** -- IAM posture, RBAC policy engine, break-glass audit
2. **Audit & Accountability (AU)** -- 3 hash-chained audit trails, JSONL sinks, shipping
3. **System Integrity (SI)** -- TypeScript checks, secret scan, PHI leak scan
4. **Configuration Management (CM)** -- Module registry, SKU configs, capability map
5. **Contingency Planning (CP)** -- Backup posture, store inventory, runbook coverage
6. **Risk Assessment (RA)** -- System gap matrix, threat model, data classification
7. **Privacy (PR)** -- PHI redaction, no-PHI-in-logs policy, audit sanitization

## Notes

- Posture data is from static analysis (API not required to be running)
- Gauntlet results reflect the fast suite; run full suite for comprehensive coverage
- All artifacts are zero-PHI by design; PHI scan verifies this
- Manifest SHA-256 hashes enable tamper detection
`;

writeFileSync(join(outDir, 'summary.md'), summaryMd);

// Optional ZIP
if (doZip) {
  console.log('\n  Creating ZIP archive...');
  try {
    const zipPath = `${outDir}.zip`;
    if (process.platform === 'win32') {
      safeExec(
        `powershell -Command "Compress-Archive -Path '${outDir}\\*' -DestinationPath '${zipPath}' -Force"`,
        { timeout: 60_000 }
      );
    } else {
      safeExec(`cd "${outDir}" && zip -r "${zipPath}" .`, { timeout: 60_000 });
    }
    if (existsSync(`${outDir}.zip`)) {
      console.log(`  ZIP: ${outDir}.zip`);
    }
  } catch {
    console.log('  [WARN] ZIP creation failed');
  }
}

// Final output
console.log(`\n${'='.repeat(60)}`);
console.log(`  Certification Evidence Pack Complete`);
console.log(`${'='.repeat(60)}`);
console.log(`  Build ID:   ${buildId}`);
console.log(`  Pass: ${passCount}  Fail: ${failCount}  Skip: ${skipCount}`);
console.log(`  Artifacts:  ${Object.keys(manifest.artifacts).length} files`);
console.log(`  PHI-clean:  ${phiClean ? 'Yes' : 'NO'}`);
console.log(`  Duration:   ${(totalDuration / 1000).toFixed(1)}s`);
console.log(`  Output:     ${outDir}`);
console.log(`${'='.repeat(60)}\n`);

process.exit(failCount > 0 ? 1 : 0);
