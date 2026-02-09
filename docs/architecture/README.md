# Architecture

## High-level model (layers)
1) Web UI (React) — browser-based clinical workflow
2) API (Node.js) — REST/FHIR/GraphQL (as needed)
3) Bridge (mg-dbx-napi) — Node.js ↔ YottaDB interface
4) Core (VistA on YottaDB) — clinical logic + FileMan data
5) Supporting services (later) — auth, billing, analytics

## Tenancy model
- One facility = one VistA instance (container-per-tenant)
- Central “control plane” (later) provisions, monitors, and updates tenants

## MVP build sequence
Patient Search → Allergies → Vitals (avoid Scheduling/CPOE early)

## Where to find decisions
- Notion → Decision Log (ADRs)
- Optional snapshots → `docs/decisions/`
