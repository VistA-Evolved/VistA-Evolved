# ADR: Portal Reuse Analysis v1

**Status:** Accepted  
**Date:** 2025-02-21  
**Phase:** 61 -- Patient Portal Digital Front Door v1

## Context

Phase 61 requires a patient portal baseline. Before building, we inventoried
existing code (Phases 26-33) and three reference projects.

## Decision

**Reuse the existing portal codebase. Enhance, do not rebuild.**

The portal app (`apps/portal/`) was built across Phases 26-33 and already
provides 15+ dashboard pages, portal-specific auth, IAM lifecycle, health
data proxy, messaging, appointments, sharing, exports, proxy access,
telehealth, and AI help.

Phase 61 wires the 5 remaining "integration pending" health endpoints to
real VistA RPCs and adds governance labels.

## Reference Projects Analyzed

### 1. HealtheMe (WorldVistA)
- **Path:** `reference/HealtheMe-master/`
- **License:** Apache 2.0
- **Usage:** Referenced for VistA patient portal domain patterns (health
  record sections, medication views, allergy display). Design influence only.
- **Code reused:** None. HealtheMe is Java/JSP; our portal is Next.js/React.

### 2. Ottehr
- **Path:** `reference/ottehr ehr main/ottehr-main/`
- **License:** MIT + attribution
- **Usage:** Referenced for modern React portal patterns (component structure,
  responsive layout, patient-facing UX). Design influence only.
- **Code reused:** None. Our component architecture predates this reference.

### 3. AIOTP (All In One Telehealth Platform)
- **Path:** `reference/All In One Telehealth Platform -AIOTP-/aiotp-main/`
- **License:** CC BY-NC-SA 4.0
- **Usage:** Observed only. This license prohibits commercial use and
  requires share-alike. No code, patterns, or structural designs were
  derived from this project.
- **Code reused:** None. Strict observe-only policy.

## Clean Room Declaration

All portal code in `apps/portal/` and `apps/api/src/routes/portal-*.ts` is
original work created during Phases 26-33. Reference projects were consulted
for domain understanding only. No code was copied, translated, or
structurally derived from any reference project.

## Alternatives Considered

1. **Build from scratch** -- Rejected. 15+ pages already exist.
2. **Fork HealtheMe** -- Rejected. Java/JSP stack incompatible.
3. **Fork Ottehr** -- Rejected. Different architecture; our portal
   already has equivalent features.

## Consequences

- Phase 61 scope is enhancement, not greenfield.
- 5 pending VistA endpoints wired to real RPCs.
- AI assist gets governance labels.
- Health Records UI renders real data.
- Existing portal auth, IAM, messaging, sharing, export infrastructure
  is preserved and reused.
