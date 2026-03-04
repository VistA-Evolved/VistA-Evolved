/**
 * Phase 54 -- RPC Gating Audit Module
 *
 * Verifies:
 *   1. Every callRpc/safeCallRpc/callRpcWithList string literal is in rpcRegistry
 *   2. Every registry entry is in Vivian OR RPC_EXCEPTIONS
 *   3. Exceptions have non-empty reasons
 *   4. Orphan detection (registry entries never called in source)
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

export const rpcGatingAudit: AuditModule = {
  name: 'rpcGatingAudit',
  requires: 'offline',

  async run(root: string): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    // Load rpcRegistry source
    const registryFile = join(root, 'apps', 'api', 'src', 'vista', 'rpcRegistry.ts');
    if (!existsSync(registryFile)) {
      findings.push({
        rule: 'registry-exists',
        status: 'fail',
        severity: 'critical',
        message: 'rpcRegistry.ts not found',
      });
      return findings;
    }

    const registrySource = readFileSync(registryFile, 'utf-8');

    // Parse registry names
    const registryStart = registrySource.indexOf('export const RPC_REGISTRY');
    const exceptionsStart = registrySource.indexOf('export const RPC_EXCEPTIONS');
    if (registryStart === -1 || exceptionsStart === -1) {
      findings.push({
        rule: 'registry-parsed',
        status: 'fail',
        severity: 'critical',
        message: 'Could not find RPC_REGISTRY or RPC_EXCEPTIONS in source',
      });
      return findings;
    }

    const namePattern = /name:\s*["']([^"']+)["']/g;
    const reasonPattern = /reason:\s*["']([^"']+)["']/g;

    const registrySection = registrySource.slice(registryStart, exceptionsStart);
    const registryNames: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = namePattern.exec(registrySection)) !== null) {
      registryNames.push(m[1]);
    }

    const exceptionSection = registrySource.slice(exceptionsStart);
    const exNamePattern = /name:\s*["']([^"']+)["']/g;
    const exceptionNames: string[] = [];
    const exceptionReasons: string[] = [];
    while ((m = exNamePattern.exec(exceptionSection)) !== null) {
      exceptionNames.push(m[1]);
    }
    while ((m = reasonPattern.exec(exceptionSection)) !== null) {
      exceptionReasons.push(m[1]);
    }

    const allKnown = new Set([
      ...registryNames.map((n) => n.toUpperCase()),
      ...exceptionNames.map((n) => n.toUpperCase()),
    ]);

    findings.push({
      rule: 'registry-parsed',
      status: 'pass',
      severity: 'info',
      message: `Registry: ${registryNames.length} RPCs, ${exceptionNames.length} exceptions`,
    });

    // Load Vivian index if available
    const vivianIndex = join(root, 'data', 'vista', 'vivian', 'rpc_index.json');
    let vivianNames: Set<string> | null = null;
    if (existsSync(vivianIndex)) {
      const vivianData = JSON.parse(readFileSync(vivianIndex, 'utf-8'));
      vivianNames = new Set(
        (vivianData.rpcs || []).map((r: { name: string }) => r.name.toUpperCase())
      );
      findings.push({
        rule: 'vivian-loaded',
        status: 'pass',
        severity: 'info',
        message: `Loaded ${vivianNames.size} RPCs from Vivian index`,
      });
    } else {
      findings.push({
        rule: 'vivian-loaded',
        status: 'warn',
        severity: 'medium',
        message: 'Vivian index not found -- skipping Vivian cross-ref',
      });
    }

    // Check 1: registry entries in Vivian or exceptions
    if (vivianNames) {
      const notInVivian: string[] = [];
      for (const name of registryNames) {
        const upper = name.toUpperCase();
        if (!vivianNames.has(upper) && !exceptionNames.some((e) => e.toUpperCase() === upper)) {
          notInVivian.push(name);
        }
      }
      if (notInVivian.length === 0) {
        findings.push({
          rule: 'registry-in-vivian',
          status: 'pass',
          severity: 'info',
          message: 'All registry entries are in Vivian or exceptions',
        });
      } else {
        findings.push({
          rule: 'registry-in-vivian',
          status: 'fail',
          severity: 'high',
          message: `${notInVivian.length} entries not in Vivian or exceptions: ${notInVivian.join(', ')}`,
        });
      }
    }

    // Check 2: exception reasons
    const emptyReasons: string[] = [];
    for (let i = 0; i < exceptionNames.length; i++) {
      if (!exceptionReasons[i] || exceptionReasons[i].trim().length < 5) {
        emptyReasons.push(exceptionNames[i]);
      }
    }
    if (emptyReasons.length === 0) {
      findings.push({
        rule: 'exception-reasons',
        status: 'pass',
        severity: 'info',
        message: `All ${exceptionNames.length} exceptions have valid reasons`,
      });
    } else {
      findings.push({
        rule: 'exception-reasons',
        status: 'fail',
        severity: 'medium',
        message: `Exceptions with missing reasons: ${emptyReasons.join(', ')}`,
      });
    }

    // Check 3: scan source for callRpc patterns
    const apiSrc = join(root, 'apps', 'api', 'src');
    const files = collectFiles(apiSrc);
    const rpcCallPattern =
      /(?:callRpc|safeCallRpc|callRpcWithList|safeCallRpcWithList)\s*\(\s*["']([^"']+)["']/g;
    const calledRpcs = new Set<string>();
    const ungatedRpcs: { name: string; file: string; line: number }[] = [];

    for (const file of files) {
      // Skip test files and the registry itself
      const rel = relative(root, file).replace(/\\/g, '/');
      if (
        rel.includes('rpcRegistry.ts') ||
        rel.includes('.test.') ||
        rel.includes('check-rpc-registry')
      )
        continue;

      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
        rpcCallPattern.lastIndex = 0;
        let cm: RegExpExecArray | null;
        while ((cm = rpcCallPattern.exec(line)) !== null) {
          const rpcName = cm[1];
          calledRpcs.add(rpcName.toUpperCase());
          if (!allKnown.has(rpcName.toUpperCase())) {
            ungatedRpcs.push({ name: rpcName, file: rel, line: i + 1 });
          }
        }
      }
    }

    if (ungatedRpcs.length === 0) {
      findings.push({
        rule: 'all-rpcs-gated',
        status: 'pass',
        severity: 'info',
        message: `All ${calledRpcs.size} called RPCs are in registry or exceptions`,
      });
    } else {
      for (const u of ungatedRpcs) {
        findings.push({
          rule: 'all-rpcs-gated',
          status: 'fail',
          severity: 'high',
          message: `Ungated RPC "${u.name}"`,
          file: u.file,
          line: u.line,
          fix: `Add "${u.name}" to RPC_REGISTRY or RPC_EXCEPTIONS in rpcRegistry.ts`,
        });
      }
    }

    // Check 4: orphan detection
    const orphanRpcs = registryNames.filter((n) => !calledRpcs.has(n.toUpperCase()));
    if (orphanRpcs.length === 0) {
      findings.push({
        rule: 'no-orphan-rpcs',
        status: 'pass',
        severity: 'info',
        message: 'All registry entries are referenced in source',
      });
    } else {
      findings.push({
        rule: 'no-orphan-rpcs',
        status: 'warn',
        severity: 'low',
        message: `${orphanRpcs.length} orphan RPC(s) in registry: ${orphanRpcs.join(', ')}`,
        fix: 'Remove unused entries or wire them to endpoints',
      });
    }

    return findings;
  },
};
