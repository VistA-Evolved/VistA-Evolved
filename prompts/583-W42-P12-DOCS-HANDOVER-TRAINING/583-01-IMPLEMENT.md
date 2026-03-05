# Phase 583 — W42-P12: Documentation, Handover, and Training (Phase 9)

> Wave 42: Production Remediation | Position 12 of 15
> Depends on: Phases 572-582 (all prior remediation work)

---

## Objective

Create ARCHITECTURE.md, Getting Started guide, phase lineage, canonical tagging, and training materials. Consolidate scattered docs for human and AI handover.

---

## 9A: Create ARCHITECTURE.md

**Location:** `docs/ARCHITECTURE.md` or repo root `ARCHITECTURE.md`

**Contents:**

- High-level system diagram (Mermaid)
- Module map with status (implemented / partial / integration-pending)
- Data flow: Browser -> Next.js -> Fastify API -> VistA RPC -> MUMPS globals
- Technology stack with version pinning
- Database schema overview (PG tables, RLS, tenant model)
- VistA integration model (XWB RPC Broker, connection pool, DUZ-per-request)
- Authentication flow (VistA RPC auth, OIDC/Keycloak, portal auth)
- Deployment model (Docker Compose dev, Helm/K8s prod)

---

## 9B: Getting Started Developer Guide

**Location:** `docs/GETTING-STARTED.md`

**Contents:**

- Prerequisites (Node 24, pnpm 10, Docker)
- Clone, install, start (step by step, tested on Windows + Mac + Linux)
- How to run VistA Docker (VEHU lane)
- How to run the API and verify it works
- How to run the web UI and login
- How to run tests (unit, E2E, integration)
- How to add a new feature (route -> RPC -> UI flow)
- How to add a new VistA RPC (registry -> adapter -> route -> UI)
- Common pitfalls (top 20 from AGENTS.md)

---

## 9C: Phase Lineage and Canonical Tagging

**Files:**

- `docs/qa/phase-lineage.json` — Maps phase N extended by M, superseded by P
- `docs/qa/canonical-phases.md` — List of ~50-80 canonical phases
- Mark each phase: `canonical`, `superseded`, `diagnostic`, `meta`

---

## 9D: Prompts Structure Fix

- Every phase folder must have `XX-01-IMPLEMENT.md` and `XX-99-VERIFY.md`
- Run `node scripts/build-phase-index.mjs` to regenerate `phase-index.json`
- Verify all phase folders are indexed

---

## 9E: Consolidate Scattered Docs

- Bug reports -> `docs/BUG-TRACKER.md`
- Architecture decisions -> `docs/adrs/` (ADR format)
- Runbooks -> `docs/runbooks/` (verify completeness)
- Phase summaries in `ops/` -> reference from phase folders

---

## 9F: Update AGENTS.md

Add entries for:

- RPC connection pool with DUZ-per-request
- Redis integration
- All new PG tables (Phase 6)
- New FHIR profiles
- Drug interaction checking
- Single-DUZ problem documentation

---

## 9G: Update README.md

- Which features work end-to-end
- Which features are integration-pending (with vistaGrounding)
- How to run the full system
- How to run tests
- Link to ARCHITECTURE.md and Getting Started

---

## 9H: Training Materials

**Location:** `docs/training/`

| File                           | Purpose                                     |
| ------------------------------ | ------------------------------------------- |
| vista-rpc-protocol-primer.md   | XWB protocol, SPack/LPack, cipher pads      |
| mumps-basics-for-developers.md | Globals, FileMan, routines                  |
| tenant-isolation-guide.md      | RLS, tenant context, store resolver         |
| adding-a-new-rpc.md            | Step-by-step from "I need data" to endpoint |
| cprs-panel-development.md      | Building a new CPRS panel                   |

---

## Files to Create/Modify

- `docs/ARCHITECTURE.md` (or root)
- `docs/GETTING-STARTED.md`
- `docs/qa/phase-lineage.json`
- `docs/qa/canonical-phases.md`
- `docs/training/*.md` (5 files)
- `AGENTS.md` — Add new entries
- `README.md` — Update

---

## Acceptance Criteria

- [ ] ARCHITECTURE.md exists with system diagram
- [ ] GETTING-STARTED.md exists and is tested
- [ ] phase-lineage.json and canonical-phases.md exist
- [ ] All phase folders have IMPLEMENT and VERIFY files
- [ ] docs/training/ has 5 training docs
- [ ] AGENTS.md and README.md updated
