# Wave 18 -- Extensibility + Event Bus + Webhooks + FHIR Subscriptions + Plugins

> Canonical domain event bus, webhook framework with signing and retries,
> FHIR Subscriptions (rest-hook), backend plugin SDK, UI extension slots,
> plugin marketplace, ecosystem certification runner.

## Phase Map

| Wave Phase | Resolved ID | Title                                 | Prompt Folder                      |
| ---------- | ----------- | ------------------------------------- | ---------------------------------- |
| W18-P1     | 354         | Range Reservation + Manifest + ADRs   | `354-W18-P1-MANIFEST-ADRS`         |
| W18-P2     | 355         | Canonical Domain Event Bus            | `355-W18-P2-EVENT-BUS`             |
| W18-P3     | 356         | Webhooks Framework                    | `356-W18-P3-WEBHOOKS`              |
| W18-P4     | 357         | FHIR Subscriptions v1 (rest-hook)     | `357-W18-P4-FHIR-SUBSCRIPTIONS`    |
| W18-P5     | 358         | Backend Plugin SDK                    | `358-W18-P5-PLUGIN-SDK`            |
| W18-P6     | 359         | UI Extension Slots                    | `359-W18-P6-UI-EXTENSIONS`         |
| W18-P7     | 360         | Plugin Marketplace + Install/Approval | `360-W18-P7-PLUGIN-MARKETPLACE`    |
| W18-P8     | 361         | Ecosystem Certification Runner        | `361-W18-P8-ECOSYSTEM-CERT-RUNNER` |

## ADR Index (Phase 354)

| ADR                    | Path                                     |
| ---------------------- | ---------------------------------------- |
| Event Bus Architecture | `docs/decisions/ADR-EVENT-BUS.md`        |
| Webhook Security       | `docs/decisions/ADR-WEBHOOK-SECURITY.md` |
| Plugin Model           | `docs/decisions/ADR-PLUGIN-MODEL.md`     |

## Dependencies & Run Order

```
W18-P1 (manifest + ADRs)
  +-> W18-P2 (event bus) --> W18-P3 (webhooks, uses event bus)
  |                      +-> W18-P4 (FHIR subscriptions, uses webhooks)
  +-> W18-P5 (plugin SDK, uses event bus)
  |     +-> W18-P6 (UI extensions, uses plugin model)
  |     +-> W18-P7 (marketplace, uses plugin SDK)
  +-> W18-P8 (cert runner, tests all above)
```

## Scope

Wave 18 adds extensibility infrastructure:

1. **Event Bus** -- versioned domain events with outbox, replay, DLQ, tenant isolation
2. **Webhooks** -- HMAC-signed delivery with retries, backoff, per-tenant routing
3. **FHIR Subscriptions** -- rest-hook delivery for resource events (R4 conformant)
4. **Plugin SDK** -- safe extension points with signing, isolation, timeouts
5. **UI Extensions** -- controlled widget/tile slots with tenant policies
6. **Plugin Marketplace** -- install/approve/audit flow with versioning
7. **Cert Runner** -- single-command ecosystem safety verification

## Definition of Done

- Event bus exists and is replayable per tenant
- Webhook framework is signed + retryable + auditable
- Minimal FHIR Subscriptions supported (rest-hook only)
- Plugin SDK + marketplace works with signing and tenant policies
- UI extension slots render in allowed tenants only
- Ecosystem cert runner validates all contracts
