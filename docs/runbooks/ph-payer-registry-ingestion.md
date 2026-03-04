# PH Payer Registry Ingestion + Capability Matrix -- Runbook

> Phase 88 | VistA-Evolved

---

## Overview

The PH Payer Registry is a regulator-grounded ingestion pipeline that imports
the Insurance Commission of the Philippines (IC) list of licensed HMOs and
HMO Brokers into an in-memory registry store. Each payer is then tracked in
a capability matrix that records integration readiness per transaction type.

**Key rule:** No capability can be marked "active" without at least one
evidence link (URL, internal note, or runbook reference).

---

## 1. Data Sources

| Source             | File                                                  | URL                                               |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------- |
| IC HMO List        | `data/regulator-snapshots/ph-ic-hmo-list.json`        | https://www.insurance.gov.ph/list-of-hmos/        |
| IC HMO Broker List | `data/regulator-snapshots/ph-ic-hmo-broker-list.json` | https://www.insurance.gov.ph/list-of-hmo-brokers/ |

Each file contains:

- `source`, `sourceUrl`, `asOfDate` metadata
- Array of `entries` with `name` and optional `caNumber`

---

## 2. Running Ingestion

### Via API

```bash
curl -X POST http://localhost:3001/rcm/payerops/registry/ingest \
  -H "Content-Type: application/json" \
  -d '{"target": "all"}'
```

Target options: `all`, `hmo`, `broker`

### What happens

1. Reads snapshot JSON from `data/regulator-snapshots/`
2. Creates a source record (idempotent via SHA-256 hash)
3. Auto-increments version per source type
4. Upserts payers (deduplicates by canonical name)
5. Diffs against previous snapshot (added/removed/renamed)
6. Saves raw artifact to `artifacts/regulator/<YYYY-MM-DD>/` (gitignored)
7. Records versioned snapshot with diff entries
8. Initializes capability matrix cells for new payers

### Idempotency

Running ingestion twice with the same data produces no new payers -- the
hash-based source dedup and name-matching payer dedup ensure stability.

---

## 3. Registry API Endpoints

| Method | Path                                                            | Description                    |
| ------ | --------------------------------------------------------------- | ------------------------------ |
| GET    | `/rcm/payerops/registry/health`                                 | Registry + matrix stats        |
| GET    | `/rcm/payerops/registry/sources`                                | Ingestion source list          |
| POST   | `/rcm/payerops/registry/ingest`                                 | Run ingestion pipeline         |
| GET    | `/rcm/payerops/registry/snapshots`                              | Versioned snapshots with diffs |
| GET    | `/rcm/payerops/payers`                                          | Filterable payer list          |
| GET    | `/rcm/payerops/payers/:id`                                      | Payer detail + capabilities    |
| PATCH  | `/rcm/payerops/payers/:id`                                      | Update payer fields            |
| POST   | `/rcm/payerops/payers/merge`                                    | Merge duplicate payers         |
| GET    | `/rcm/payerops/capability-matrix`                               | Full matrix grid               |
| GET    | `/rcm/payerops/capability-matrix/:payerId`                      | Per-payer capabilities         |
| PATCH  | `/rcm/payerops/capability-matrix/:payerId`                      | Update capability cell         |
| POST   | `/rcm/payerops/capability-matrix/:payerId/evidence`             | Add evidence                   |
| DELETE | `/rcm/payerops/capability-matrix/:payerId/evidence/:evidenceId` | Remove evidence                |

---

## 4. Capability Matrix

### Capability Types

- **Eligibility** -- Can we check member eligibility?
- **LOA** -- Can we request Letter of Authorization?
- **Claims Submit** -- Can we submit claims electronically?
- **Claim Status** -- Can we query claim status?
- **Remittance** -- Can we receive remittance/EOB data?

### Modes

- `manual` -- Phone/fax/email
- `portal` -- Web portal login
- `api` -- Direct API integration
- `rpa_planned` -- RPA automation planned

### Maturity Levels

- `none` -- Not configured
- `planned` -- On the roadmap
- `in_progress` -- Implementation underway
- `active` -- Live and operational (**requires evidence**)

### Evidence Types

- `url` -- Link to portal, API docs, or test result
- `internal_note` -- Internal implementation note
- `runbook_ref` -- Path to runbook documenting the integration

---

## 5. Updating Regulator Data

When the Insurance Commission publishes an updated list:

1. Download the new list from the IC website
2. Update `data/regulator-snapshots/ph-ic-hmo-list.json` (or broker list)
3. Update `asOfDate` to the new date
4. Run ingestion: `POST /rcm/payerops/registry/ingest`
5. Review the diff in the Ingestion Sources tab (shows added/removed payers)

---

## 6. Adding Manual Payers

Use the PATCH endpoint to add payers not in the IC list:

```bash
# Payers are auto-created during ingestion. For manual adds, use the
# upsertRegistryPayer function via the ingest pipeline with target "all"
# after adding entries to the snapshot JSON.
```

---

## 7. Merging Duplicates

When the same payer appears under different names:

```bash
curl -X POST http://localhost:3001/rcm/payerops/payers/merge \
  -H "Content-Type: application/json" \
  -d '{"targetId": "<keep-this-id>", "sourceId": "<merge-this-id>"}'
```

The source payer's aliases and relationships transfer to the target.

---

## 8. Priority Tiers

Tiers determine implementation priority:

- `top5` -- Highest priority, integrate first
- `top10` -- Second wave
- `long_tail` -- Low volume, integrate as needed
- `untiered` -- Not yet classified

Set via PATCH or the Payer Directory UI's inline tier editor.

---

## 9. Admin UI Pages

| Page              | URL                             | Purpose                                      |
| ----------------- | ------------------------------- | -------------------------------------------- |
| Payer Directory   | `/cprs/admin/payer-directory`   | Registry browser, ingest trigger, merge tool |
| Capability Matrix | `/cprs/admin/capability-matrix` | Grid view, cell editor, evidence management  |

---

## 10. Troubleshooting

| Symptom                          | Cause                        | Fix                                            |
| -------------------------------- | ---------------------------- | ---------------------------------------------- |
| Ingestion returns 0 payers       | Snapshot JSON file not found | Verify `data/regulator-snapshots/` files exist |
| "Cannot set maturity to active"  | No evidence links            | Add at least one evidence link first           |
| Matrix shows no rows             | Ingestion not run            | POST to `/rcm/payerops/registry/ingest`        |
| Duplicate payers after re-ingest | Name mismatch                | Use merge endpoint to combine                  |
