# Prompt System Canonicalization Plan

> **Recovery and forward plan for the `/prompts` directory.**
> This stage does not rename or delete existing prompt history. It inspects structure, documents issues, and defines how future prompts must be written.

---

## 1. Current structure (inspected)

- **Meta / playbooks:** `00-ARCHIVE`, `00-PLAYBOOKS` — not phase folders.
- **Ordering rules:** `prompts/00-ORDERING-RULES.md` — folder prefix = ordering position; file prefix = phase number. IMPLEMENT (01, 02–04…), VERIFY (99, 90–98).
- **Navigation:** `prompts/00-NAVIGATE-PROMPTS.md` — prefix vs phase number, sub-phases (e.g. 37B, 37C), REDUNDANT_OF markers, tools (phase-index, prompt-ref.mjs).
- **Phase folders:** Many folders follow `<prefix>-PHASE-<phaseNum>-<TITLE>`. Prefix ranges observed: 01–16 (early), 100+ (later). Sub-phases exist (e.g. 4A, 4B, 37B, 37C, 96B, 97B, 120B, 132B).
- **Files per phase:** Typically `NNN-01-IMPLEMENT.md`, `NNN-99-VERIFY.md`; some phases have multiple IMPLEMENT/VERIFY (e.g. 02–04, 90–98) or `NOTES.md`.

---

## 2. Duplicate or conflicting numbering (documented)

- **Prefix ≠ phase number:** Same phase number can appear in different folders (e.g. multiple phases in 120 range). Navigation doc and phase-index are the authority; do not assume prefix === phase.
- **Sub-phases:** Letter suffixes (4A/4B, 37B/37C, 96B, 97B, 120B, 132B) denote sub-phases; each may have its own folder. No conflict if each folder is uniquely named.
- **Redundancy:** Some folders may overlap in topic (re-scoped or revisited work). Policy: preserve as history; use `NOTES.md` with `REDUNDANT_OF: <canonical-folder>` when a canonical folder exists. Do not delete.
- **726-PHASE-726:** Large phase (many IMPLEMENT/VERIFY files); numbering within the folder follows the existing pattern (01–99, with many VERIFY variants). No structural conflict; treat as one phase with many sub-steps.
- **00-ARCHIVE:** Contains legacy prompts; status = LEGACY_REFERENCE. Do not renumber or delete; index for reference.

---

## 3. Canonical future numbering (proposed)

- **New phase folders:** Use next available prefix and unique phase number. Pattern: `<prefix>-PHASE-<phaseNum>-<TITLE>`. Avoid reusing an existing phase number for a different topic.
- **New files inside a phase:** Use phase number as file prefix. Required: at least one IMPLEMENT, one VERIFY. Optional: NOTES, EVIDENCE (see below).
- **Sub-phases:** Use letter suffix (e.g. 37B, 37C) and separate folder when the work is a distinct sub-phase; document relationship in NOTES or in 00-NAVIGATE-PROMPTS.md.
- **Tooling:** Keep using `docs/qa/phase-index.json`, `node scripts/prompt-ref.mjs --phase N`, and ordering gate; regenerate phase index when adding phases.

---

## 4. Preserve legacy prompts as history

- Do not bulk rename or delete existing phase folders or files in this stage.
- Mark obsolete or superseded folders in `NOTES.md` with `REDUNDANT_OF` or `SUPERSEDED_BY` and the canonical folder name.
- `00-ARCHIVE` and any other archive folders remain as-is; reference them from the source-of-truth index or an archive index under `docs/archive/` if needed.

---

## 5. How future prompts must be written

Future prompts (and new phase content) must follow these file types and naming:

| Type | File pattern | Purpose |
|------|------------------|---------|
| **IMPLEMENT** | `NNN-01-IMPLEMENT.md` (and 02, 03, 04 as needed) | Implementation steps; files to touch; ordered sub-steps. |
| **VERIFY** | `NNN-99-VERIFY.md` (and 90–98 as needed) | Verification steps; acceptance criteria; commands and expected results. |
| **NOTES** | `NOTES.md` | Optional notes; REDUNDANT_OF/SUPERSEDED_BY; rationale; no replacement for IMPLEMENT/VERIFY. |
| **EVIDENCE** | Optional; e.g. under `/artifacts/` or linked from VERIFY | Proof: command output, logs, screenshots. Evidence lives in `/artifacts/`; do not commit large binaries in prompts. |

- **Minimum content:** IMPLEMENT must have implementation steps and files touched; VERIFY must have verification steps and acceptance criteria (per `prompts/00-ORDERING-RULES.md`).
- **Traceability:** Each phase folder should be traceable from code comments or runbooks via phase number and, when helpful, prompt folder name (see `prompts/00-NAVIGATE-PROMPTS.md`).

---

## 6. Relation to other docs

- **Source-of-truth index** — `docs/canonical/source-of-truth-index.md` (points here for prompt sequencing and canonicalization).
- **Ordering rules** — `prompts/00-ORDERING-RULES.md` (authoritative for folder/file naming).
- **Navigation** — `prompts/00-NAVIGATE-PROMPTS.md` (how to find phases, sub-phases, redundancy).
- **Documentation policy** — `docs/POLICY.md` (§4 Prompts Directory Rules).
