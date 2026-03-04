# Certification Evidence Pack -- Runbook (Phase 291)

> **Purpose**: Generate a comprehensive, auditable evidence bundle that groups
> all certification artifacts with SHA-256 checksums and gap detection.

---

## 1. Overview

The evidence pack builder scans the repository for:

- `evidence/**` -- wave/phase verification outputs
- `docs/runbooks/*.md` -- operational runbooks
- `scripts/verify-*.ps1` -- phase verifiers
- `tests/interop/*.mjs` -- interop certification suites
- `tests/k6/*.js` -- load test scripts
- `prompts/` -- phase prompt folders

It produces two artifacts in `artifacts/evidence-pack/`:

1. **manifest.json** -- machine-readable inventory with SHA-256 checksums
2. **EVIDENCE_INDEX.md** -- human-readable index for auditors

---

## 2. Usage

### Generate the evidence pack

```powershell
node scripts/build-evidence-pack.mjs
```

### Custom output directory

```powershell
node scripts/build-evidence-pack.mjs --out ./my-evidence
```

### Strict mode (fail on gaps)

```powershell
node scripts/build-evidence-pack.mjs --strict
```

---

## 3. Output Structure

```
artifacts/evidence-pack/
  manifest.json        -- Full inventory + checksums
  EVIDENCE_INDEX.md    -- Markdown index for auditors
```

### manifest.json schema

```json
{
  "generatedAt": "ISO-8601",
  "summary": {
    "evidenceFiles": 25,
    "runbooks": 40,
    "verifiers": 60,
    "gaps": 0
  },
  "evidence": { "wave-11/290": [{ "path": "...", "hash": "...", "size": 123 }] },
  "runbooks": [{ "name": "...", "path": "...", "hash": "..." }],
  "verifiers": [{ "name": "...", "path": "...", "phase": "290" }],
  "gaps": []
}
```

---

## 4. Gap Detection

The builder detects:

- **Verifiers without evidence**: A `verify-phase290-*.ps1` exists but no
  `evidence/*/290/` directory has files
- Gaps are reported as warnings by default; use `--strict` to fail on them

---

## 5. CI Integration

```yaml
- name: Build evidence pack
  run: node scripts/build-evidence-pack.mjs --strict --out artifacts/evidence-pack
- name: Upload evidence
  uses: actions/upload-artifact@v4
  with:
    name: evidence-pack
    path: artifacts/evidence-pack/
```

---

## 6. Regeneration

The evidence index and manifest are NOT committed (they live in `artifacts/`
which is gitignored). Regenerate before any audit or certification review:

```powershell
node scripts/build-evidence-pack.mjs
```
