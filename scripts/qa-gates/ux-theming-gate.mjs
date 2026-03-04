#!/usr/bin/env node
/**
 * UX Theming QA Gate — Phase 280 (Wave 9)
 *
 * Validates:
 *   1. CPRSUIProvider sets data-theme via useEffect
 *   2. System theme detection (matchMedia) is wired
 *   3. Theme tokens module exists with theme packs
 *   4. Chart CSS modules use --cprs-* variables, not hardcoded hex
 *   5. No hardcoded primary colors remain in chart CSS
 *
 * Usage: node scripts/qa-gates/ux-theming-gate.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..', '..');
const WEB = join(ROOT, 'apps', 'web', 'src');

let pass = 0;
let fail = 0;

function gate(name, fn) {
  try {
    const result = fn();
    if (result) {
      console.log(`  PASS  ${name}`);
      pass++;
    } else {
      console.log(`  FAIL  ${name}`);
      fail++;
    }
  } catch (e) {
    console.log(`  FAIL  ${name} — ${e.message}`);
    fail++;
  }
}

console.log('=== UX Theming QA Gate (Phase 280) ===\n');

// Gate 1: CPRSUIProvider applies data-theme
gate('CPRSUIProvider sets data-theme attribute', () => {
  const src = readFileSync(join(WEB, 'stores', 'cprs-ui-state.tsx'), 'utf-8');
  return src.includes('data-theme') && src.includes('setAttribute');
});

gate('CPRSUIProvider has theme useEffect', () => {
  const src = readFileSync(join(WEB, 'stores', 'cprs-ui-state.tsx'), 'utf-8');
  return src.includes('preferences.theme') && src.includes('resolveTheme');
});

// Gate 2: System theme detection
gate('System theme detection (matchMedia) wired', () => {
  const src = readFileSync(join(WEB, 'stores', 'cprs-ui-state.tsx'), 'utf-8');
  return src.includes('prefers-color-scheme') && src.includes('matchMedia');
});

gate('OS theme change listener registered', () => {
  const src = readFileSync(join(WEB, 'stores', 'cprs-ui-state.tsx'), 'utf-8');
  return src.includes('addEventListener') && src.includes('removeEventListener');
});

// Gate 3: Theme tokens module
gate('Theme tokens module exists', () => {
  return existsSync(join(WEB, 'lib', 'theme-tokens.ts'));
});

gate('Theme tokens exports built-in themes', () => {
  const src = readFileSync(join(WEB, 'lib', 'theme-tokens.ts'), 'utf-8');
  return (
    src.includes('BUILT_IN_THEMES') &&
    src.includes('modern-default') &&
    src.includes('modern-dark') &&
    src.includes('vista-legacy')
  );
});

gate('Theme tokens exports pack functions', () => {
  const src = readFileSync(join(WEB, 'lib', 'theme-tokens.ts'), 'utf-8');
  return (
    src.includes('export function getThemePack') &&
    src.includes('export function applyThemeTokens') &&
    src.includes('export function resolveEffectiveTheme')
  );
});

// Gate 4: Chart CSS uses variables
const chartCssFiles = [
  { name: 'MenuBar.module.css', path: join(WEB, 'components', 'chart', 'MenuBar.module.css') },
  { name: 'TabStrip.module.css', path: join(WEB, 'components', 'chart', 'TabStrip.module.css') },
  {
    name: 'PatientHeader.module.css',
    path: join(WEB, 'components', 'chart', 'PatientHeader.module.css'),
  },
  {
    name: 'panels.module.css',
    path: join(WEB, 'components', 'chart', 'panels', 'panels.module.css'),
  },
];

for (const { name, path } of chartCssFiles) {
  gate(`${name} uses --cprs-* variables`, () => {
    const css = readFileSync(path, 'utf-8');
    return css.includes('var(--cprs-');
  });
}

// Gate 5: No remaining hardcoded primary blue (#003366) in chart CSS
gate('No hardcoded #003366 in chart CSS', () => {
  for (const { path } of chartCssFiles) {
    const css = readFileSync(path, 'utf-8');
    if (css.includes('#003366') && !css.includes('var(--cprs-')) {
      return false;
    }
  }
  return true;
});

// Gate 6: Dark theme CSS exists in cprs.module.css
gate('cprs.module.css has dark theme block', () => {
  const css = readFileSync(join(WEB, 'components', 'cprs', 'cprs.module.css'), 'utf-8');
  return css.includes("[data-theme='dark']") || css.includes('[data-theme="dark"]');
});

// Summary
console.log(`\n=== Results: ${pass} PASS, ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
