/**
 * Phase 54 -- Fake Success Audit Module
 *
 * Detects handlers that return ok:true without actually performing work:
 *   1. Handlers returning ok:true alongside "Not implemented" or empty data
 *   2. Error-swallowing catch blocks that return ok:true
 *   3. Integration-pending routes returning ok:true without status field
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, extname } from 'path';
import type { AuditModule, AuditFinding } from '../types.js';

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs']);
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', '.turbo', 'coverage', '.pnpm']);

function collectFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (stat.isFile() && SCAN_EXTENSIONS.has(extname(entry))) {
      results.push(full);
    }
  }
  return results;
}

export const fakeSuccessAudit: AuditModule = {
  name: 'fakeSuccessAudit',
  requires: 'offline',

  async run(root: string): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    const apiSrc = join(root, 'apps', 'api', 'src');
    const files = collectFiles(apiSrc);

    let fakeCount = 0;
    let swallowCount = 0;

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const rel = relative(root, file).replace(/\\/g, '/');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Skip comments
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

        // Pattern 1: ok: true + "Not implemented" or "not yet" nearby
        if (/ok:\s*true/.test(trimmed)) {
          // Check surrounding lines (i-2 to i+2) for "not implemented" signals
          const context = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 4)).join(' ');
          if (
            /not\s+implemented|todo|fixme|placeholder|stub/i.test(context) &&
            !/integration-pending|status:\s*["']integration-pending/.test(context)
          ) {
            fakeCount++;
            findings.push({
              rule: 'no-fake-success',
              status: 'fail',
              severity: 'high',
              message: `Handler returns ok:true with placeholder/stub indicator`,
              file: rel,
              line: i + 1,
              fix: 'Return ok:false or use integration-pending status pattern',
            });
          }
        }

        // Pattern 2: catch blocks that return ok:true (error swallowing)
        if (/\}\s*catch\s*\(/.test(trimmed) || /catch\s*\(\s*\w+\s*\)/.test(trimmed)) {
          // Look ahead for ok:true in the catch block
          const catchContext = lines.slice(i, Math.min(lines.length, i + 10)).join('\n');
          if (
            /ok:\s*true/.test(catchContext) &&
            !/log\.\w+|console\.\w+|throw/.test(catchContext)
          ) {
            swallowCount++;
            findings.push({
              rule: 'no-error-swallow',
              status: 'fail',
              severity: 'high',
              message: `Catch block returns ok:true without logging or re-throwing`,
              file: rel,
              line: i + 1,
              fix: 'Log the error and return ok:false, or re-throw',
            });
          }
        }

        // Pattern 3: ok: false with "Not implemented" is CORRECT pattern
        // (no finding needed, but count for stats)
      }
    }

    // Also scan route files for empty reply.send({}) patterns
    const routeDir = join(apiSrc, 'routes');
    if (existsSync(routeDir)) {
      const routeFiles = collectFiles(routeDir);
      for (const file of routeFiles) {
        const content = readFileSync(file, 'utf-8');
        const rel = relative(root, file).replace(/\\/g, '/');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('//') || line.startsWith('*')) continue;

          // Empty reply.send({}) -- suspicious
          if (/reply\.send\(\s*\{\s*\}\s*\)/.test(line)) {
            findings.push({
              rule: 'no-empty-reply',
              status: 'warn',
              severity: 'medium',
              message: `Empty reply.send({}) -- may be a fake success`,
              file: rel,
              line: i + 1,
              fix: 'Return meaningful data or an explicit error',
            });
          }
        }
      }
    }

    if (fakeCount === 0 && swallowCount === 0) {
      findings.push({
        rule: 'no-fake-success',
        status: 'pass',
        severity: 'info',
        message: `No fake-success patterns found in ${files.length} files`,
      });
    }

    findings.push({
      rule: 'fake-success-stats',
      status: 'pass',
      severity: 'info',
      message: `Fake ok:true = ${fakeCount}, error-swallow = ${swallowCount}`,
    });

    return findings;
  },
};
