# VistA Evolved

Modern browser-based EHR built on proven VistA clinical logic.

## What this is
VistA Evolved is a modern React + Node.js platform that wraps VistA/YottaDB with browser-based workflows and modern APIs.

## Where the project is managed
- Notion: Company HQ → VistA Evolved HQ (roadmap, ADRs, features, notes)
- GitHub: source code + technical runbooks + implementation artifacts

## Current MVP scope (first demo)
Patient Search → Allergies → Vitals  
(Not in MVP: Scheduling, CPOE/Orders)

## Repo structure
- `apps/web` — Browser UI (React)
- `apps/api` — API server (Node.js)
- `services/vista` — VistA/YottaDB environment (containers + scripts)
- `docs` — architecture, decisions, runbooks
- `scripts` — helper scripts and automation

## Contributing (early stage)
- Decisions are logged in Notion ADRs first, then summarized in `docs/decisions/` as needed.
- Features are defined in Notion Features backlog with a Feature Spec template.
