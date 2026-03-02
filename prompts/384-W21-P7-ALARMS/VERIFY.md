# Phase 384 — W21-P7 VERIFY: Alarms Pipeline

## Verification Gates
1. alarm-types.ts exports DeviceAlarm, AlarmRoutingRule, AlarmAcknowledgment, AlarmStats
2. AlarmPriority: low | medium | high | crisis
3. AlarmState: active | latched | acknowledged | resolved | escalated
4. alarm-store.ts exports createAlarm, getAlarm, listAlarms, acknowledgeAlarm, escalateAlarm
5. alarm-store.ts exports addRoutingRule, listRoutingRules, deleteRoutingRule
6. alarm-store.ts exports getAlarmStats, getAlarmAudit
7. Routing rules use regex matching and priority thresholds
8. POST /devices/alarms creates alarm with routing
9. GET /devices/alarms lists with state/priority/device/patient filters
10. POST /devices/alarms/:id/acknowledge tracks userId + reason
11. POST /devices/alarms/:id/escalate increments level + sets target
12. PATCH /devices/alarms/:id/state supports all 5 states
13. POST /devices/alarms/routing-rules creates rules
14. GET /devices/alarms/routing-rules lists sorted by priority
15. DELETE /devices/alarms/routing-rules/:id removes rule
16. GET /devices/alarms/stats returns priority/source breakdown
17. GET /devices/alarms/audit returns audit trail
18. store-policy.ts includes 4 alarm store entries
19. Barrel index.ts exports alarmRoutes
