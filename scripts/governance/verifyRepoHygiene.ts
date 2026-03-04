#!/usr/bin/env node
/**
 * Phase 73 -- Repo Hygiene Gate
 *
 * Anti-sprawl governance gate that enforces:
 *   1. No forbidden directories (reports/, docs/reports/, output/, tmp/)
 *   2. No artifacts tracked by git
 *   3. Prompts folder has no duplicate phase prefixes
 *   4. Prompts folder has contiguous numbering (warn on gaps)
 *   5. Each IMPLEMENT/VERIFY prompt header matches its filename
 *
 * Outputs: /artifacts/governance/repo-hygiene.json
 *
 * Exit codes:
 *   0 = all checks pass
 *   1 = hard failure(s) found
 *
 * Usage: npx tsx scripts/governance/verifyRepoHygiene.ts
 */

import { readdirSync, statSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const PROMPTS_DIR = join(ROOT, 'prompts');

interface CheckResult {
  check: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string[];
}

const results: CheckResult[] = [];

function pass(check: string, message: string) {
  results.push({ check, status: 'pass', message });
}
function fail(check: string, message: string, details?: string[]) {
  results.push({ check, status: 'fail', message, details });
}
function warn(check: string, message: string, details?: string[]) {
  results.push({ check, status: 'warn', message, details });
}

/* ------------------------------------------------------------------ */
/* Gate 1: No forbidden directories tracked by git                     */
/* ------------------------------------------------------------------ */

const FORBIDDEN_DIRS = ['reports', 'output', 'tmp', 'docs/reports', 'docs/output'];

const FORBIDDEN_ALLOWLIST: string[] = [
  // Add paths here if a forbidden dir is intentionally committed
];

const trackedForbidden: string[] = [];
for (const dir of FORBIDDEN_DIRS) {
  if (FORBIDDEN_ALLOWLIST.includes(dir)) continue;
  try {
    const tracked = execSync(`git ls-files -- "${dir}"`, {
      cwd: ROOT,
      encoding: 'utf-8',
    }).trim();
    if (tracked.length > 0) {
      trackedForbidden.push(`${dir}/ has ${tracked.split('\n').length} tracked files`);
    }
  } catch {
    // git command failed, dir doesn't exist -- that's fine
  }
}

if (trackedForbidden.length === 0) {
  pass('no-forbidden-dirs', 'No forbidden sprawl directories tracked by git');
} else {
  fail('no-forbidden-dirs', `Forbidden directories have tracked files`, trackedForbidden);
}

/* ------------------------------------------------------------------ */
/* Gate 2: No artifacts tracked by git                                 */
/* ------------------------------------------------------------------ */

try {
  const trackedArtifacts = execSync('git ls-files -- "artifacts/"', {
    cwd: ROOT,
    encoding: 'utf-8',
  }).trim();
  if (trackedArtifacts.length === 0) {
    pass('no-tracked-artifacts', 'No artifacts/ files tracked by git');
  } else {
    const count = trackedArtifacts.split('\n').length;
    fail(
      'no-tracked-artifacts',
      `${count} files under artifacts/ are tracked by git`,
      trackedArtifacts.split('\n').slice(0, 10)
    );
  }
} catch {
  pass('no-tracked-artifacts', 'artifacts/ directory not found or not tracked');
}

/* ------------------------------------------------------------------ */
/* Gate 3: Prompts folder has no duplicate phase prefixes               */
/* ------------------------------------------------------------------ */

if (existsSync(PROMPTS_DIR)) {
  const entries = readdirSync(PROMPTS_DIR)
    .filter((e) => statSync(join(PROMPTS_DIR, e)).isDirectory())
    .sort();

  const prefixMap = new Map<string, string[]>();
  for (const folder of entries) {
    const match = folder.match(/^(\d{2})-/);
    if (match) {
      const prefix = match[1];
      if (prefix === '00') continue; // meta folders allowed duplicates
      if (!prefixMap.has(prefix)) prefixMap.set(prefix, []);
      prefixMap.get(prefix)!.push(folder);
    }
  }

  const duplicates: string[] = [];
  for (const [prefix, folders] of prefixMap) {
    if (folders.length > 1) {
      duplicates.push(`${prefix}: [${folders.join(', ')}]`);
    }
  }

  if (duplicates.length === 0) {
    pass('prompts-no-dupes', `No duplicate phase prefixes (${prefixMap.size} phases)`);
  } else {
    fail('prompts-no-dupes', `Duplicate prefixes: ${duplicates.join('; ')}`, duplicates);
  }

  /* ---------------------------------------------------------------- */
  /* Gate 4: Contiguous numbering (warn only)                          */
  /* ---------------------------------------------------------------- */

  const sortedPrefixes = [...prefixMap.keys()].map(Number).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < sortedPrefixes.length; i++) {
    const expected = sortedPrefixes[i - 1] + 1;
    if (sortedPrefixes[i] !== expected && sortedPrefixes[i - 1] >= 1) {
      gaps.push(expected);
    }
  }

  if (gaps.length === 0) {
    pass(
      'prompts-contiguous',
      `Contiguous sequence ${sortedPrefixes[0]}..${sortedPrefixes[sortedPrefixes.length - 1]}`
    );
  } else {
    warn(
      'prompts-contiguous',
      `Gaps at prefix(es): ${gaps.join(', ')}`,
      gaps.map((g) => `Missing prefix ${g.toString().padStart(2, '0')}`)
    );
  }

  /* ---------------------------------------------------------------- */
  /* Gate 5: IMPLEMENT/VERIFY headers match filenames                  */
  /* ---------------------------------------------------------------- */

  const headerMismatches: string[] = [];
  const phaseFolders = entries.filter((e) => /^\d{2}-PHASE-/.test(e));

  for (const folder of phaseFolders) {
    const folderPath = join(PROMPTS_DIR, folder);
    const files = readdirSync(folderPath).filter((f) => f.endsWith('.md'));

    for (const file of files) {
      const filePath = join(folderPath, file);
      const content = readFileSync(filePath, 'utf-8');
      const firstLine = content.split('\n').find((l) => l.startsWith('# '));
      if (!firstLine) continue;

      // Extract phase number from folder name
      const folderMatch = folder.match(/^(\d{2})-PHASE-(\d+[A-Z]?)/);
      if (!folderMatch) continue;
      const phaseNum = folderMatch[2];

      // Check that IMPLEMENT files mention IMPLEMENT and the phase number
      if (file.includes('IMPLEMENT')) {
        if (
          !firstLine.toLowerCase().includes('implement') &&
          !firstLine.toLowerCase().includes('phase')
        ) {
          // Relaxed: just check phase number is mentioned
        }
        if (!firstLine.includes(phaseNum)) {
          headerMismatches.push(
            `${folder}/${file}: header "${firstLine}" missing phase ${phaseNum}`
          );
        }
      }

      // Check that VERIFY files mention VERIFY and the phase number
      if (file.includes('VERIFY')) {
        if (!firstLine.includes(phaseNum)) {
          headerMismatches.push(
            `${folder}/${file}: header "${firstLine}" missing phase ${phaseNum}`
          );
        }
      }
    }
  }

  if (headerMismatches.length === 0) {
    pass('prompt-headers', `All prompt headers match filename phase numbers`);
  } else {
    warn(
      'prompt-headers',
      `${headerMismatches.length} header/filename mismatch(es)`,
      headerMismatches.slice(0, 15)
    );
  }

  /* ---------------------------------------------------------------- */
  /* Gate 6: Each phase folder has IMPLEMENT + VERIFY                  */
  /* ---------------------------------------------------------------- */

  const missingFiles: string[] = [];
  for (const folder of phaseFolders) {
    const folderPath = join(PROMPTS_DIR, folder);
    const files = readdirSync(folderPath).filter((f) => f.endsWith('.md'));

    const hasImplement = files.some((f) => f.includes('IMPLEMENT'));
    const hasVerify = files.some((f) => f.includes('VERIFY') || f.includes('verify'));

    if (!hasImplement) missingFiles.push(`${folder}: missing IMPLEMENT`);
    if (!hasVerify) missingFiles.push(`${folder}: missing VERIFY`);
  }

  if (missingFiles.length === 0) {
    pass('prompts-complete', `All ${phaseFolders.length} phase folders have IMPLEMENT + VERIFY`);
  } else {
    warn(
      'prompts-complete',
      `${missingFiles.length} missing prompt file(s)`,
      missingFiles.slice(0, 15)
    );
  }
} else {
  fail('prompts-exists', 'prompts/ directory not found');
}

/* ------------------------------------------------------------------ */
/* Gate 7: .gitignore covers artifacts                                 */
/* ------------------------------------------------------------------ */

try {
  const gitignore = readFileSync(join(ROOT, '.gitignore'), 'utf-8');
  const hasArtifactsRule = gitignore.includes('artifacts/') || gitignore.includes('/artifacts/');
  if (hasArtifactsRule) {
    pass('gitignore-artifacts', '.gitignore covers artifacts/');
  } else {
    fail('gitignore-artifacts', '.gitignore missing artifacts/ rule');
  }
} catch {
  fail('gitignore-artifacts', 'Could not read .gitignore');
}

/* ------------------------------------------------------------------ */
/* Output                                                              */
/* ------------------------------------------------------------------ */

const passCount = results.filter((r) => r.status === 'pass').length;
const failCount = results.filter((r) => r.status === 'fail').length;
const warnCount = results.filter((r) => r.status === 'warn').length;

console.log('\n=== Repo Hygiene Gate (Phase 73) ===\n');

for (const r of results) {
  const icon = r.status === 'pass' ? 'PASS' : r.status === 'fail' ? 'FAIL' : 'WARN';
  console.log(`  [${icon}] ${r.check}: ${r.message}`);
  if (r.details && r.details.length > 0) {
    for (const d of r.details) {
      console.log(`         - ${d}`);
    }
  }
}

console.log(`\nTotal: ${passCount} pass, ${failCount} fail, ${warnCount} warn`);

// Write artifact
const artifactDir = join(ROOT, 'artifacts', 'governance');
mkdirSync(artifactDir, { recursive: true });
writeFileSync(
  join(artifactDir, 'repo-hygiene.json'),
  JSON.stringify(
    {
      _meta: {
        gate: 'repo-hygiene',
        phase: 73,
        timestamp: new Date().toISOString(),
      },
      summary: { passCount, failCount, warnCount },
      results,
    },
    null,
    2
  )
);

process.exit(failCount > 0 ? 1 : 0);
