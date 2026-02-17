# Prompt Ordering Rules (Never break these)

## File naming rule (within each phase folder)
- 01 = IMPLEMENT
- 99 = VERIFY

Example:
- 04-01-IMPLEMENT.md
- 04-99-VERIFY.md

## Folder ordering rule
- 00-* = meta / playbooks / rules
- 01-* = bootstrap
- 02+ = build phases

## When you add new prompts inside a phase
Use:
- 02, 03, 04… for additional IMPLEMENT steps
- 90–98 for additional VERIFY steps (if needed)
- Keep 99 as the final “full verify” for that phase
### Sub-phase interleaving (accepted variant)
When a phase has sub-phases (A, B, C, D), you may interleave
IMPLEMENT+VERIFY pairs using sequential even/odd numbering:
- 01 = Sub-phase A IMPLEMENT
- 02 = Sub-phase A VERIFY
- 03 = Sub-phase B IMPLEMENT
- 04 = Sub-phase B VERIFY
- …and so on up through 08
- 99 = Full phase VERIFY

This pattern is used in Phases 5–9 (folders 07–11) and is valid.
## Full end-to-end prompts
Put them only in:
prompts/00-PLAYBOOKS/

Naming:
00-XX-FULL-AUDIT-FIX-VERIFY-Phase1-to-PhaseY.md
