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

## Full end-to-end prompts
Put them only in:
prompts/00-PLAYBOOKS/

Naming:
00-XX-FULL-AUDIT-FIX-VERIFY-Phase1-to-PhaseY.md
