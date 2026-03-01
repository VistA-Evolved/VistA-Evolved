# Edge Device Gateway Runbook

## Phase 379 (W21-P2)

### Overview
The edge device gateway subsystem provides a registration, heartbeat, and
message ingest pipeline for on-premises gateway appliances that collect
data from medical devices (monitors, analyzers, POCT devices, etc.).

### Architecture
```
[Medical Devices] --> [Edge Gateway Sidecar] --outbound HTTP--> [API Server]
                      (on-premises Docker)                     (/edge-gateways/*)
```

### Gateway Lifecycle
1. **Register**: POST /edge-gateways — admin creates a gateway record
2. **Online**: Gateway sends heartbeats → status transitions to `online`
3. **Offline**: Heartbeat timeout (120s default) → status transitions to `offline`
4. **Revoked**: POST /edge-gateways/:id/revoke — permanently blocks the gateway

### Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /edge-gateways | admin | Register gateway |
| GET | /edge-gateways | admin | List gateways |
| GET | /edge-gateways/:id | admin | Get gateway |
| PATCH | /edge-gateways/:id/status | admin | Update status |
| POST | /edge-gateways/:id/revoke | admin | Revoke gateway |
| DELETE | /edge-gateways/:id | admin | Delete gateway |
| GET | /edge-gateways/:id/health | admin | Health snapshot |
| GET | /edge-gateways/:id/config | admin | Get config |
| PUT | /edge-gateways/:id/config | admin | Update config |
| POST | /edge-gateways/:id/heartbeat | service | Record heartbeat |
| POST | /edge-gateways/uplink | service | Ingest uplink message |
| GET | /edge-gateways/uplink/buffer | admin | View message buffer |
| POST | /edge-gateways/observations | service | Store observation |
| GET | /edge-gateways/observations | admin | Query observations |
| GET | /edge-gateways/observations/:id | admin | Get observation |
| GET | /edge-gateways/stats | admin | Store stats |

### Running the Sidecar
```bash
cd services/edge-gateway
docker compose --profile gateway up -d
```

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| MAX_EDGE_GATEWAYS | 200 | Max registered gateways |
| MAX_DEVICE_OBSERVATIONS | 50000 | Max observations in memory |
| MAX_UPLINK_BUFFER | 10000 | Max uplink messages buffered |
| GATEWAY_HEARTBEAT_TIMEOUT_MS | 120000 | Heartbeat timeout before offline |
| GATEWAY_CLEANUP_INTERVAL_MS | 60000 | Cleanup interval |
| GATEWAY_SERVICE_KEY | (required) | Service-to-service auth key |

### Troubleshooting
- **Gateway stays offline**: Check heartbeat interval, network connectivity,
  and `GATEWAY_SERVICE_KEY` match between sidecar and API
- **Uplink returns 409**: Duplicate messageId — idempotency working correctly
- **Uplink returns 400 gateway_revoked**: Gateway was revoked, must re-register
