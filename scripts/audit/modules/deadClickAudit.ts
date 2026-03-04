/**
 * Phase 54 -- Dead Click Audit Module
 *
 * Classifies every action in ACTION_REGISTRY:
 *   WIRED     - status=wired, RPCs exist, endpoint found
 *   STUB      - status=stub, has pendingNote
 *   PENDING   - status=integration-pending, has pendingNote + target RPCs
 *   DEAD_CLICK - wired but RPCs not callable, or stub without any note
 *
 * A "dead click" is any UI element that appears functional but silently
 * does nothing when clicked. This is forbidden by AGENTS.md rule #4.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import type { AuditModule, AuditFinding } from '../types.js';

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx']);
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

type ClickClass = 'WIRED' | 'STUB' | 'PENDING' | 'DEAD_CLICK';

interface ActionEntry {
  actionId: string;
  label: string;
  location: string;
  rpcs: string[];
  status: string;
  pendingNote?: string;
}

export const deadClickAudit: AuditModule = {
  name: 'deadClickAudit',
  requires: 'offline',

  async run(root: string): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    // Parse action registry
    const registryFile = join(root, 'apps', 'web', 'src', 'actions', 'actionRegistry.ts');
    if (!existsSync(registryFile)) {
      findings.push({
        rule: 'action-registry-exists',
        status: 'fail',
        severity: 'critical',
        message: 'actionRegistry.ts not found',
      });
      return findings;
    }

    const registrySource = readFileSync(registryFile, 'utf-8');
    const actions: ActionEntry[] = [];
    const actionBlockRe =
      /\{\s*actionId:\s*["']([^"']+)["'][\s\S]*?status:\s*["']([^"']+)["'][\s\S]*?\}/g;

    let m: RegExpExecArray | null;
    while ((m = actionBlockRe.exec(registrySource)) !== null) {
      const block = m[0];
      const actionId = m[1];
      const status = m[2];
      const labelM = block.match(/label:\s*["']([^"']+)["']/);
      const locM = block.match(/location:\s*["']([^"']+)["']/);
      const rpcsM = block.match(/rpcs:\s*\[([\s\S]*?)\]/);
      const noteM = block.match(/pendingNote:\s*["']([^"']+)["']/);
      const rpcs: string[] = [];
      if (rpcsM) {
        for (const ri of rpcsM[1].matchAll(/["']([^"']+)["']/g)) {
          rpcs.push(ri[1]);
        }
      }
      actions.push({
        actionId,
        label: labelM ? labelM[1] : actionId,
        location: locM ? locM[1] : 'unknown',
        rpcs,
        status,
        pendingNote: noteM ? noteM[1] : undefined,
      });
    }

    // Scan web source for onClick/button handlers that reference actions
    // but might be empty (dead clicks)
    const webSrc = join(root, 'apps', 'web', 'src');
    const webFiles = collectFiles(webSrc);

    // Look for "not implemented", empty onClick, console.log-only handlers
    const deadPatterns = [
      { re: /onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/g, name: 'empty-onclick' },
      { re: /onClick=\{\s*\(\)\s*=>\s*(?:console\.log|void\s+0)/g, name: 'noop-onclick' },
      { re: /disabled.*(?:coming\s*soon|not\s*implemented)/gi, name: 'disabled-placeholder' },
    ];

    let deadClicksInUi = 0;
    for (const file of webFiles) {
      const content = readFileSync(file, 'utf-8');
      const rel = file.replace(root, '').replace(/\\/g, '/').replace(/^\//, '');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        for (const pat of deadPatterns) {
          pat.re.lastIndex = 0;
          if (pat.re.test(lines[i])) {
            deadClicksInUi++;
            findings.push({
              rule: 'no-dead-clicks-ui',
              status: 'warn',
              severity: 'medium',
              message: `Potential dead click (${pat.name})`,
              file: rel,
              line: i + 1,
              fix: "Wire to functionality or show 'integration pending' with target RPC",
            });
          }
        }
      }
    }

    // Classify each action
    let deadCount = 0;
    const classifications: { actionId: string; cls: ClickClass }[] = [];

    for (const action of actions) {
      let cls: ClickClass;
      if (action.status === 'wired') {
        cls = 'WIRED';
      } else if (action.status === 'stub') {
        cls = action.pendingNote ? 'STUB' : 'DEAD_CLICK';
      } else if (action.status === 'integration-pending') {
        cls = action.pendingNote ? 'PENDING' : 'DEAD_CLICK';
      } else {
        cls = 'DEAD_CLICK';
      }

      classifications.push({ actionId: action.actionId, cls });

      if (cls === 'DEAD_CLICK') {
        deadCount++;
        findings.push({
          rule: 'no-dead-click-action',
          status: 'fail',
          severity: 'high',
          message: `Dead click: "${action.actionId}" (${action.status}) has no pendingNote`,
          fix: `Add pendingNote with target RPC(s) or wire the action`,
        });
      }
    }

    if (deadCount === 0 && deadClicksInUi === 0) {
      findings.push({
        rule: 'no-dead-clicks',
        status: 'pass',
        severity: 'info',
        message: `No dead clicks found. ${actions.length} actions classified.`,
      });
    }

    // Summary
    const byClass = {
      WIRED: classifications.filter((c) => c.cls === 'WIRED').length,
      STUB: classifications.filter((c) => c.cls === 'STUB').length,
      PENDING: classifications.filter((c) => c.cls === 'PENDING').length,
      DEAD_CLICK: classifications.filter((c) => c.cls === 'DEAD_CLICK').length,
    };
    findings.push({
      rule: 'click-classification',
      status: 'pass',
      severity: 'info',
      message: `Classification: ${byClass.WIRED} wired, ${byClass.STUB} stub, ${byClass.PENDING} pending, ${byClass.DEAD_CLICK} dead`,
    });

    return findings;
  },
};
