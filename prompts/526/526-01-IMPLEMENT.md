# Phase 526 — C5: Device Registry Durability v1

## Goal
PG tables and repo for managed devices, patient associations, location mappings, audit.

## Implementation
- PG schema: pgManagedDevice, pgDevicePatientAssociation, pgDeviceLocationMapping, pgDeviceAuditLog
- PG migration v56
- PG repo: pg-device-registry-repo.ts
- RLS + store-policy updates
