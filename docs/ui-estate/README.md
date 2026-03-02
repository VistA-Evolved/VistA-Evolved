# UI Estate Catalog

> Phase 531 (Wave 39 P1) — Machine-readable catalog of every VA and IHS
> desktop GUI surface, mapped to VistA-Evolved coverage status.

## What Is This?

The UI Estate Catalog inventories every significant UI surface from the
legacy VA and IHS desktop applications and tracks the migration status
of each surface into VistA-Evolved.

**Key files:**

| File | Purpose |
|------|---------|
| `data/ui-estate/ui-estate.schema.json` | JSON Schema for catalog entries |
| `data/ui-estate/va-ui-estate.json` | VA systems catalog (CPRS, BCMA, Imaging, MHA, etc.) |
| `data/ui-estate/ihs-ui-estate.json` | IHS systems catalog (RPMS EHR, iCare, BPRM, BSDX) |
| `data/ui-estate/ui-gap-report.json` | Auto-generated gap report (run build script) |
| `scripts/ui-estate/build-ui-estate.mjs` | Gap report builder |

## Coverage Model

Each surface has 6 boolean coverage flags:

| Flag | Meaning |
|------|---------|
| `present_ui` | A UI page or component exists in VistA-Evolved |
| `present_api` | An API route exists for this surface's data |
| `vista_rpc_wired` | The API calls VistA RPCs via rpcBrokerClient |
| `writeback_ready` | Write operations (POST/PUT) are functional |
| `tests_present` | E2E or API tests cover this surface |
| `evidence_present` | Evidence artifacts exist for verification |

A surface is considered **"covered"** if both `present_ui` AND
`present_api` are true.

## Migration Status Ladder

| Status | Meaning |
|--------|---------|
| `not-started` | No VistA-Evolved equivalent exists |
| `scaffold` | UI/API skeleton exists but not wired to VistA |
| `api-wired` | Read path works (GET returns VistA data) |
| `writeback` | Write path works (POST/PUT modifies VistA) |
| `parity` | Feature-complete vs legacy desktop |
| `certified` | Verified by acceptance harness (Phase 542) |

## Priority Levels

| Priority | Meaning |
|----------|---------|
| `p0-critical` | Must have for go-live. Blocks clinical workflows. |
| `p1-high` | Important for user adoption. Near-term target. |
| `p2-medium` | Desirable. Can be deferred past initial launch. |
| `p3-low` | Nice to have. May be replaced by different approach. |

## How to Update the Catalog

1. **Edit the JSON files directly.** The schema validates entries.
2. **Run the build script** to regenerate the gap report:

```bash
node scripts/ui-estate/build-ui-estate.mjs
# or with details:
node scripts/ui-estate/build-ui-estate.mjs --verbose
```

3. **Add new surfaces** when a new VA/IHS application is identified.
4. **Update coverage flags** when implementation progresses:
   - When you add a new page: set `present_ui: true`
   - When you add an API route: set `present_api: true`
   - When you wire RPC calls: set `vista_rpc_wired: true`
   - When you add write operations: set `writeback_ready: true`
   - When you add tests: set `tests_present: true`
   - When evidence is generated: set `evidence_present: true`
5. **Set `veEquivalent`** to link VistA-Evolved routes/pages/components.
6. **Advance `migrationStatus`** as the surface matures.

## Systems Covered

### VA Systems (va-ui-estate.json)

- **BCMA** — Bar Code Medication Administration
- **VistA Imaging (VI/VIX)** — Enterprise imaging + teleradiology
- **IVS/SIC** — Scanned image / document capture
- **MHA** — Mental Health Assistant (screening instruments)
- **VSE/VS GUI** — VistA Scheduling Enhancement
- **CPRS** — Computerized Patient Record System
- **Clinical Procedures (CP/MD)** — Device-acquired clinical data
- **JLV** — Joint Longitudinal Viewer
- **VistAWeb** — Web-based clinical viewer
- **CDSP** — Clinical Decision Support Platform
- **CISS** — Clinical Information Support System
- **VA Direct** — Secure health information exchange
- **E-Signature** — Electronic signature service
- **HINGE** — Health Information National Gateway Exchange
- **HWSC** — Health Web Services Client (FHIR)
- **Lighthouse** — VA API Platform
- **VES** — Veteran Enrollment System
- **MHV** — My HealtheVet (patient portal)
- **VODA** — VistA Object Display Application
- **NUMI** — Nursing Unit Management Indicators
- **PATS** — Patient Advocate Tracking System
- **Person Services (MPI)** — Master Patient Index
- **VistA Audit Solution** — Audit trail management
- **ADT** — Admission/Discharge/Transfer

### IHS Systems (ihs-ui-estate.json)

- **RPMS EHR + VueCentric** — IHS electronic health record
- **iCare** — IHS clinical analytics (GPRA)
- **BPRM v4** — IHS patient registration
- **BSDX/PIMS** — IHS scheduling

## Verification

```bash
.\scripts\verify-phase531-ui-estate-catalog.ps1
```

See `prompts/531/531-99-VERIFY.md` for gate definitions.
