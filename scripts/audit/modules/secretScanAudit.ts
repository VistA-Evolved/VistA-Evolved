/**
 * Phase 54 -- Secret Scan Audit Module
 *
 * Wraps the Phase 16 secret-scan.mjs patterns into the Audit v2 framework.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, extname } from 'path';
import type { AuditModule, AuditFinding } from '../types.js';

const SCAN_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.yml',
  '.yaml',
  '.toml',
  '.env',
  '.md',
  '.sh',
  '.ps1',
  '.bat',
  '.cmd',
]);
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
  '.turbo',
  '.pnpm',
  'coverage',
  '.nyc_output',
]);
const SKIP_FILES = new Set([
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'secret-scan.mjs',
  'secretScanAudit.ts',
]);

const SECRET_PATTERNS = [
  {
    name: 'Hardcoded password',
    regex: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']{4,}["']/gi,
    allow: [
      '.env.example',
      '.md',
      'AGENTS.md',
      'BUG-TRACKER.md',
      '.test.ts',
      '.spec.ts',
      'docker-compose',
      'reference/',
    ],
  },
  {
    name: 'AWS Access Key',
    regex: /AKIA[0-9A-Z]{16}/g,
    allow: [],
  },
  {
    name: 'Generic API key',
    regex: /(?:api[_-]?key|apikey)\s*[:=]\s*["'][a-zA-Z0-9]{20,}["']/gi,
    allow: ['.env.example'],
  },
  {
    name: 'Private key header',
    regex: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
    allow: [],
  },
  {
    name: 'Hardcoded JWT/token',
    regex: /(?:token|jwt|bearer)\s*[:=]\s*["']eyJ[a-zA-Z0-9._-]{20,}["']/gi,
    allow: [],
  },
  {
    name: 'Connection string with creds',
    regex: /(?:mongodb|postgres|mysql|redis):\/\/[^:]+:[^@]+@/gi,
    allow: ['.env.example'],
  },
  {
    name: 'Hardcoded VistA creds in non-doc',
    regex: /(?:PROV123|NURSE123|PHARM123)(?:!!)?/g,
    allow: [
      '.md',
      '.env.example',
      'AGENTS.md',
      'BUG-TRACKER.md',
      'secret-scan',
      'verify-',
      'test-',
      '.test.ts',
      '.spec.ts',
      'login/page.tsx',
      'load-test.mjs',
      'patient-context.tsx',
      'login-body.json',
      'secretScanAudit.ts',
      'authRegressionAudit.ts',
      'e2e/',
      'e2e-results.json',
      'k6/',
      'tools/vista/',
      'tools/vivian/',
      'evidence/',
    ],
  },
];

function collectFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (stat.isFile()) {
      if (SKIP_FILES.has(entry)) continue;
      if (SCAN_EXTENSIONS.has(extname(entry))) {
        results.push(full);
      }
    }
  }
  return results;
}

function isAllowed(filePath: string, root: string, allowPatterns: string[]): boolean {
  const rel = relative(root, filePath).replace(/\\/g, '/');
  return allowPatterns.some((p) => rel.includes(p));
}

export const secretScanAudit: AuditModule = {
  name: 'secretScanAudit',
  requires: 'offline',

  async run(root: string): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    const files = collectFiles(root);
    let totalSecrets = 0;

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const rel = relative(root, file).replace(/\\/g, '/');

      for (const pattern of SECRET_PATTERNS) {
        pattern.regex.lastIndex = 0;
        const matches = content.match(pattern.regex);
        if (matches && !isAllowed(file, root, pattern.allow)) {
          for (const match of matches) {
            const idx = content.indexOf(match);
            const lineNum = content.slice(0, idx).split('\n').length;
            const lineStart = content.lastIndexOf('\n', idx) + 1;
            const line = content.slice(lineStart, idx + match.length + 50).split('\n')[0];
            const trimmed = line.trimStart();

            // Skip comments
            if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('#'))
              continue;

            totalSecrets++;
            findings.push({
              rule: `secret-${pattern.name.toLowerCase().replace(/\s+/g, '-')}`,
              status: 'fail',
              severity: 'critical',
              message: `${pattern.name} in ${rel}:${lineNum}`,
              file: rel,
              line: lineNum,
              fix: 'Remove hardcoded secret; use env vars',
            });
          }
        }
      }
    }

    if (totalSecrets === 0) {
      findings.push({
        rule: 'no-secrets',
        status: 'pass',
        severity: 'info',
        message: `Scanned ${files.length} files -- no secrets found`,
      });
    }

    return findings;
  },
};
