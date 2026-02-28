# Prompt Ordering Rules (Never break these)

## Folder naming rule
- Folder prefix is for **ordering** (1-3 digits): `1-`, `47-`, `179-`
- Folder pattern: `<prefix>-PHASE-<phaseNum>-<TITLE>`
- Example: `179-PHASE-211-PROMPTOPS-GOVERNANCE`
- `00-*` = meta / playbooks / rules / archive

## File naming rule (within each phase folder)
- File prefix uses the **phase number** (not the folder prefix)
- 01 = IMPLEMENT
- 99 = VERIFY

Example for Phase 211 in folder `179-PHASE-211-PROMPTOPS-GOVERNANCE/`:
- `211-01-IMPLEMENT.md`
- `211-99-VERIFY.md`

## Required content
- IMPLEMENT files must contain: `## Implementation Steps`, `## Files Touched`
- VERIFY files must contain: `## Verification Steps`, `## Acceptance Criteria`
- Minimum quality floor: 15 non-empty lines per file

## Folder ordering rule
- 00-* = meta / playbooks / rules
- 01-* = bootstrap
- 02+ = build phases (ordered sequentially)

## When you add new prompts inside a phase
Use:
- 02, 03, 04... for additional IMPLEMENT steps
- 90-98 for additional VERIFY steps (if needed)
- Keep 99 as the final "full verify" for that phase

### Sub-phase interleaving (accepted variant)
When a phase has sub-phases (A, B, C, D), you may interleave
IMPLEMENT+VERIFY pairs using sequential even/odd numbering:
- 01 = Sub-phase A IMPLEMENT
- 02 = Sub-phase A VERIFY
- 03 = Sub-phase B IMPLEMENT
- 04 = Sub-phase B VERIFY
- ...and so on up through 08
- 99 = Full phase VERIFY

This pattern is used in Phases 5-9 (folders 07-11) and is valid.

## Playbooks and wave aggregations
- Playbooks live ONLY in `prompts/00-PLAYBOOKS/`
- Wave "mega phase" docs are playbooks, not phases
- Each queue item = one phase folder with IMPLEMENT + VERIFY