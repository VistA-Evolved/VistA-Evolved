# Phase 384 — W21-P7 IMPLEMENT: Alarms Pipeline (IHE PCD ACM)

## Goal
Device alarm pipeline with severity routing, acknowledgment, escalation,
routing rules, and full audit trail per IHE PCD ACM profile.

## Files Created
- `apps/api/src/devices/alarm-types.ts` — DeviceAlarm, AlarmRoutingRule, AlarmAcknowledgment, AlarmStats types
- `apps/api/src/devices/alarm-store.ts` — In-memory alarm store with routing, ack, escalation, audit
- `apps/api/src/devices/alarm-routes.ts` — 11 REST endpoints for alarm management

## Key Design
- Alarms created from any ingest source (HL7v2, ASTM, POCT1-A, SDC, manual)
- 4-level priority: low/medium/high/crisis
- 5-state lifecycle: active -> latched -> acknowledged -> resolved (+ escalated)
- Routing rules with regex-based code/device/location matching + priority thresholds
- First-match rule evaluation (priority-ordered)
- Auto-escalation support with configurable escalation chains
- Audit trail for all state changes (20K max, FIFO)
