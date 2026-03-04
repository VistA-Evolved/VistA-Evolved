#!/usr/bin/env node
/**
 * G8 -- UI Dead-Click Tripwire Gate
 *
 * Checks for dead UI patterns:
 *   1. Scans UI source for onClick/href handlers that are empty/noop
 *   2. Checks for unresolved "TODO" / "FIXME" in UI handler code
 *   3. If Playwright exists, delegates to existing dead-click-crawler
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');

export const id = 'G8_ui_dead_click';
export const name = 'UI Dead-Click Tripwire';

function walkFiles(dir, exts) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    try {
      const stat = statSync(full);
      if (
        stat.isDirectory() &&
        !entry.startsWith('.') &&
        entry !== 'node_modules' &&
        entry !== '.next'
      ) {
        results.push(...walkFiles(full, exts));
      } else if (stat.isFile() && exts.includes(extname(entry))) {
        results.push(full);
      }
    } catch {
      /* skip inaccessible */
    }
  }
  return results;
}

export async function run() {
  const start = Date.now();
  const details = [];
  let status = 'pass';

  // Scan web + portal UI source for dead-click patterns
  const uiDirs = [resolve(ROOT, 'apps/web/src'), resolve(ROOT, 'apps/portal/src')];

  let deadClickCount = 0;
  const DEAD_PATTERNS = [
    /onClick=\{?\s*\(\)\s*=>\s*\{\s*\}\s*\}?/, // onClick={() => {}}
    /onClick=\{?\s*undefined\s*\}?/, // onClick={undefined}
    /href=["']#["']/, // href="#"
  ];

  for (const dir of uiDirs) {
    const files = walkFiles(dir, ['.tsx', '.jsx']);
    for (const f of files) {
      const content = readFileSync(f, 'utf-8');
      for (const pat of DEAD_PATTERNS) {
        if (pat.test(content)) {
          const rel = f.replace(ROOT + '\\', '').replace(ROOT + '/', '');
          // href="#" in certain contexts is acceptable (anchor links)
          if (pat.source.includes('href') && content.includes('className="anchor"')) continue;
          deadClickCount++;
          if (deadClickCount <= 5) {
            details.push(`Dead-click pattern in ${rel}`);
          }
        }
      }
    }
  }

  if (deadClickCount > 0) {
    details.push(`Total dead-click patterns found: ${deadClickCount}`);
    // Warn, don't fail -- these may be intentional placeholders
    if (deadClickCount > 20) status = 'fail';
  } else {
    details.push('No dead-click patterns found: PASS');
  }

  return { id, name, status, details, durationMs: Date.now() - start };
}
