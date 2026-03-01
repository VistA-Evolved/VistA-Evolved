# Evidence — Phase 384: W21-P7 Alarms Pipeline

## Artifacts
| File | Purpose |
|------|---------|
| `apps/api/src/devices/alarm-types.ts` | IHE PCD ACM alarm types |
| `apps/api/src/devices/alarm-store.ts` | Alarm store + routing + ack + escalation |
| `apps/api/src/devices/alarm-routes.ts` | 11 REST endpoints |

## Wiring
- `devices/index.ts` — barrel export `alarmRoutes`
- `register-routes.ts` — import + `server.register(alarmRoutes)`
- `store-policy.ts` — 4 entries (device-alarms, alarm-routing-rules, alarm-acknowledgments, alarm-audit-log)

## Gates Verified
- [x] Types: 4 exports (DeviceAlarm, AlarmRoutingRule, AlarmAcknowledgment, AlarmStats)
- [x] Store: CRUD + routing + ack + escalation + stats + audit
- [x] Routes: 11 endpoints under /devices/alarms/
- [x] Store policy: 4 entries registered
- [x] No external dependencies added
