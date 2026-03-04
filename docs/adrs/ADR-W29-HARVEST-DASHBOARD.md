# ADR-W29-HARVEST-DASHBOARD: WorldVistA Dashboard / Rules Engine Integration

**Status**: Accepted  
**Phase**: 452 (W29-P6), integration in Phase 453 (W29-P7)  
**Decision**: Integrate via adapter boundary, optional Docker service

## Context

The WorldVistA Dashboard / Clinical Rules Engine provides configurable alert
rules, patient list management, and clinical decision support. It aligns with
VistA-Evolved's existing analytics (Phase 25) and clinical reporting pipeline.

Ref: ADR-W29-OSS-HARVEST.md selected this component for integration.

## Decision

### Integration Architecture

```
VistA-Evolved API
  |
  +-- DashboardAdapter (apps/api/src/adapters/dashboard/)
  |     |-- interface.ts          -- DashboardAdapter interface
  |     |-- stub-adapter.ts       -- Returns pending status
  |     |-- worldvista-adapter.ts -- HTTP bridge to Dashboard service
  |
  +-- Dashboard Docker service (optional, profile: dashboard)
        |-- worldvista/dashboard:latest
        |-- Port: 3010 (internal)
        |-- Env: VISTA_HOST, VISTA_PORT
```

### Adapter Interface

```typescript
interface DashboardAdapter {
  getRules(): Promise<AdapterResult<ClinicalRule[]>>;
  evaluateRules(patientDfn: string): Promise<AdapterResult<RuleEvaluation[]>>;
  getAlerts(patientDfn: string): Promise<AdapterResult<ClinicalAlert[]>>;
  getPatientLists(): Promise<AdapterResult<PatientList[]>>;
}
```

### Event Bus Mapping

| VistA-Evolved Event | Dashboard Event         | Direction        |
| ------------------- | ----------------------- | ---------------- |
| `patient.viewed`    | Rule evaluation trigger | API -> Dashboard |
| `order.signed`      | Order check trigger     | API -> Dashboard |
| `alert.fired`       | Alert notification      | Dashboard -> API |

### Deployment

- Docker Compose profile: `dashboard`
- OFF by default (matches Phase 37C module toggle pattern)
- Module ID: `dashboard` added to `config/modules.json`
- Adapter env var: `ADAPTER_DASHBOARD=stub` (default) or `worldvista`

## Consequences

- New adapter type in adapter-loader.ts
- New module in module-registry
- Dashboard data stays in Dashboard service (no data duplication)
- Stub adapter returns `{ok: false, pending: true}` until service is deployed
