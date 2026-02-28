# Phase 211 — PromptOps Governance Upgrade (IMPLEMENT)

## Objective

Stop prompt drift permanently by upgrading PromptOS tooling to enforce the
modern prompts tree (2–3 digit prefixes, full phase coverage, missing
verify detection, quality floor).

## Implementation Steps

1. Update `scripts/promptos/auditPrompts.ts` to support 2–3 digit folder prefixes
   (current regex `^\d{2}-` misses 3-digit folders like `100-PHASE-...`).
2. Update `scripts/promptos/fixPrompts.ts` with the same prefix regex fix.
3. Create `scripts/qa-gates/prompts-quality-gate.mjs` enforcing:
   - At least one IMPLEMENT and one VERIFY file per phase folder
   - IMPLEMENT contains headings: `## Implementation Steps`, `## Files Touched`
   - VERIFY contains headings: `## Verification Steps`, `## Acceptance Criteria`
   - Each file has >= 15 non-empty lines (quality floor)
4. Wire the new gate into `qa/gauntlet/gates/g0-prompts-integrity.mjs`.
5. Fix `scripts/qa-runner.mjs` to use `node` instead of `pnpm exec tsx` for
   the prompts ordering check (tsx not available at root).
6. Update `docs/POLICY.md` and `prompts/00-ORDERING-RULES.md` to clarify:
   folder prefix is ordering (supports 1–3 digits); file prefix may use
   phase number; IMPLEMENT + VERIFY are mandatory per phase.

## Files Touched

- `scripts/promptos/auditPrompts.ts`
- `scripts/promptos/fixPrompts.ts`
- `scripts/qa-gates/prompts-quality-gate.mjs` (new)
- `qa/gauntlet/gates/g0-prompts-integrity.mjs`
- `scripts/qa-runner.mjs`
- `docs/POLICY.md`
- `prompts/00-ORDERING-RULES.md`
