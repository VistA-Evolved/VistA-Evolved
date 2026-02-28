# Phase 274 — VERIFY: Prompt System Canonicalization

## Gates
1. `scripts/qa/prompts-canonical-audit.mjs` exists and runs cleanly
2. Duplicate folder prefixes = 0
3. Every phase folder has implement + verify files
4. Flat files in prompts root are only meta (00-*) or README
5. Audit JSON at `artifacts/prompts-canonical-audit.json` is well-formed
6. Reindex map at `prompts/00-PLAYBOOKS/prompt-folder-reindex-map.json` committed
