# How to Navigate the Prompts Directory

> This guide explains how to find, interpret, and trace prompts in VistA-Evolved.
> Read this before touching any code that references "Phase ###" or "Wave ###."

---

## 1. Folder Prefix vs Phase Number

Every prompt folder has this structure:

```
<prefix>-PHASE-<phaseNum>-<TITLE>
```

**The prefix is the ordering position**, not the phase number.

Example:

| Folder                               | Prefix | Phase# | Title                |
| ------------------------------------ | ------ | ------ | -------------------- |
| `02-PHASE-1-HELLO-SYSTEM`            | 02     | 1      | Hello System         |
| `179-PHASE-211-PROMPTOPS-GOVERNANCE` | 179    | 211    | PromptOps Governance |

So folder `179` holds Phase 211. **Never assume prefix == phase number.**

### Wave Folders

Some folders use `Wave` numbering:

```
<prefix>-W<wave>-P<wavePosition>-<TITLE>
```

Example: `512-W36-P3-VISTA-BASELINE-LANE` = prefix 512, Wave 36, position 3.

### Meta Folders

Folders starting with `00-` are meta/rules/playbooks. They are not phases.

---

## 2. File Naming Rules

Inside each phase folder:

| File suffix                                     | Meaning                            |
| ----------------------------------------------- | ---------------------------------- |
| `*-01-IMPLEMENT.md`                             | Implementation steps               |
| `*-99-VERIFY.md`                                | Verification / acceptance criteria |
| `*-02-IMPLEMENT.md` through `*-04-IMPLEMENT.md` | Additional sub-phase implements    |
| `*-90-VERIFY.md` through `*-98-VERIFY.md`       | Additional verification steps      |
| `NOTES.md`                                      | Optional notes, redundancy markers |

The file prefix uses the **phase number** (not the folder prefix):

```
179-PHASE-211-PROMPTOPS-GOVERNANCE/
  211-01-IMPLEMENT.md     <-- phase 211, implement
  211-99-VERIFY.md        <-- phase 211, verify
```

---

## 3. How to Find a Phase Mentioned in Code Comments

When you see `// Phase 284` in code:

### Method A: Use the Phase Resolver Tool (Recommended)

```bash
node scripts/prompt-ref.mjs --phase 284
```

This prints:

- Matching prompt folder(s)
- Title
- IMPLEMENT/VERIFY files
- Wave metadata if present

### Method B: Use the Phase Index JSON

Open `docs/qa/phase-index.json` and search for `"phaseNumber": "284"`.

### Method C: Manual Search

```bash
# PowerShell
Get-ChildItem prompts -Directory | Where-Object { $_.Name -match 'PHASE-284-' }
```

### Method D: Use PROMPTS_INDEX.md

Open `prompts/PROMPTS_INDEX.md` — it's a table of all folders with their phase numbers.

---

## 4. Interpreting Duplicates and Sub-Phases

### Sub-Phases (A, B, C, D)

Some phases have suffixes like `37B`, `37C`, `95B`. These are sub-phases
of the base phase and live in separate folders:

```
prompts/
  42-PHASE-37-MODULE-ARCHITECTURE/
  43-PHASE-37B-PRODUCT-MODULARITY/
  44-PHASE-37C-MODULAR-PACKAGING/
```

All three are related to Phase 37 but address different concerns.

### Redundant Folders

Some folders cover overlapping topics because work was re-scoped or revisited.
These are NOT deleted (we preserve history). Instead, look for:

```
NOTES.md containing:
  REDUNDANT_OF: <canonical-folder-name>
```

When a REDUNDANT_OF marker exists, the canonical folder is the one to follow.
The redundant folder is preserved as historical context.

### Wave Mega-Prompts

Wave-level folders (e.g., `500-WAVE-35-*`) are rollup playbooks, not
individual implementation phases. They aggregate multiple phases into one
wave plan.

---

## 5. Index and Audit Tools

| Tool              | Command                                   | Output                          |
| ----------------- | ----------------------------------------- | ------------------------------- |
| Phase Index       | `pnpm qa:phase-index`                     | `docs/qa/phase-index.json`      |
| PROMPTS_INDEX     | `node scripts/prompts-index.mjs`          | `prompts/PROMPTS_INDEX.md`      |
| Phase Registry    | `pnpm qa:phase-registry`                  | `artifacts/phase-registry.json` |
| Ordering Gate     | See below                                 | Console PASS/FAIL               |
| Phase Resolver    | `node scripts/prompt-ref.mjs --phase 284` | Console lookup                  |
| Comment Audit     | `node scripts/qa/phase-comment-audit.mjs` | `docs/qa/phase-comment-audit.*` |
| Redundancy Report | `docs/qa/prompt-redundancy-report.md`     | Static doc                      |

### Running the Ordering Gate

```bash
# From repo root (requires tsx via api workspace):
apps/api/node_modules/.bin/tsx scripts/check-prompts-ordering.ts
```

---

## 6. Rules for New Phase References in Code

When adding a new code comment referencing a phase, use this format:

```
Phase <token> (PromptFolder: <foldername>)
```

Example:

```typescript
// Phase 284 (PromptFolder: 260-PHASE-284-PROMPT-AUDIT-TOOLS)
```

This makes the reference directly grep-searchable and unambiguous.
For existing code, use the resolver tool + audit report to trace references.

---

## 7. Quick Reference: Prefix Ranges

| Prefix Range | Content                               |
| ------------ | ------------------------------------- |
| 00-\*        | Meta, rules, playbooks, archive       |
| 01           | Bootstrap                             |
| 02-50        | Core build phases (early)             |
| 51-200       | Expanded features + hardening         |
| 200-400      | Advanced features, enterprise, audit  |
| 400+         | Waves, deep integrations, late phases |

The exact ranges grow as new phases are added. Use `docs/qa/phase-index.json`
as the canonical reference — never hardcode prefix assumptions.
