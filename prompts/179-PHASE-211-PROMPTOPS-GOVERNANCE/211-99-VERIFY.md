# Phase 211 — PromptOps Governance Upgrade (VERIFY)

## Verification Steps

1. Run prompts tree health gate:
   ```
   node scripts/qa-gates/prompts-tree-health.mjs
   ```
2. Run phase index gate:
   ```
   node scripts/qa-gates/phase-index-gate.mjs
   ```
3. Run the new prompts quality gate:
   ```
   node scripts/qa-gates/prompts-quality-gate.mjs
   ```
4. Run Gauntlet fast suite:
   ```
   pnpm qa:gauntlet:fast
   ```

## Acceptance Criteria

- `prompts-quality-gate.mjs` exits 0 (or only WARNs for legacy folders)
- Gauntlet fast suite passes G0 (prompts integrity)
- `auditPrompts.ts` correctly processes 3-digit folder prefixes
- `pnpm qa:prompts` no longer fails with "tsx not found"
- POLICY.md and ORDERING-RULES.md reflect 1–3 digit prefix support

## If Verification Fails

- Check console output for the specific failing gate
- Fix the code or prompts tree as indicated
- Re-run until all gates pass
