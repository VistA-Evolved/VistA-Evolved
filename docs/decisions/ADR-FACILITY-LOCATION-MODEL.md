# ADR: Facility/Location Model

## Status

Accepted

## Context

VistA-Evolved needs to represent multi-facility hospital systems and clinic networks.
VistA uses Divisions (File 4), Wards (File 42), Clinics (File 44), and Rooms.
We need a platform-native hierarchy that maps cleanly to VistA but is not constrained by it.

## Decision

- **Hierarchy:** Tenant → Facility → Department → Location (clinic/ward/room)
- **PG-first:** All entities stored in PG with tenant RLS.
- **VistA mapping table:** Optional `vista_mapping` JSONB column stores
  `{ vistaFile, vistaIen, vistaName, mappedAt }` per entity. Not 1:1 forced.
- **Provider assignments:** Join table `provider_facility_assignment` links
  providers (by DUZ or OIDC sub) to facilities/departments.
- **Location types:** Enum: `clinic`, `ward`, `room`, `telehealth`, `mobile`.
- **Facility types:** Enum: `hospital`, `clinic`, `satellite`, `lab`, `pharmacy`.
- **Immutable audit:** All CRUD operations logged to immutable audit trail.

## Consequences

- Facilities exist even if VistA division doesn't map.
- Department-scoped ABAC unlocked (W17-P3).
- Scheduling bound to locations (W17-P7).
