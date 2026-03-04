# ADR: IEEE 11073 SDC Support Posture

- **Status**: Accepted
- **Date**: 2026-03-01
- **Phase**: 378 (W21-P1)

## Context

IEEE 11073 Service-oriented Device Connectivity (SDC) is the modern
standard for point-of-care medical device communication. It replaces the
older IEEE 11073-20601 transport profiles with a DPWS/WS-Discovery based
architecture. SDC adoption is growing in ICU environments but is not yet
universal.

## Decision

**Support SDC as an optional microservice** via the `sdc11073` Python
library, deployed as a sidecar container that forwards normalized
observations to the API.

### Rationale

1. **Protocol complexity**: SDC uses DPWS (Devices Profile for Web Services),
   WS-Discovery, WS-Eventing, and BICEPS data model. Implementing this in
   Node.js from scratch would be a multi-month effort.

2. **Existing OSS**: The `sdc11073` Python library (BSD-3-Clause) provides
   a complete SDC consumer implementation. It handles discovery, connection,
   and BICEPS metric/alert/waveform subscriptions.

3. **Sidecar pattern**: The SDC consumer runs as a Python container that
   subscribes to SDC devices on the local network, normalizes observations
   to our internal format, and POSTs them to the API ingest endpoint. This
   isolates the Python dependency and allows independent scaling.

4. **Optional by design**: Not all deployments have SDC devices. The sidecar
   is behind `docker compose --profile sdc`. The API ingest endpoint accepts
   observations regardless of source protocol — the SDC sidecar is just
   another producer.

### Architecture

```
[SDC Device] --DPWS/WS-Eventing--> [sdc11073 sidecar]
                                         |
                                    normalize to JSON
                                         |
                                    POST /devices/ingest
                                         v
                                    [API server]
```

### Library

| Component | License      | Notes                          |
| --------- | ------------ | ------------------------------ |
| sdc11073  | BSD-3-Clause | Python IEEE 11073 SDC consumer |
| lxml      | BSD          | XML parsing dependency         |

### Trade-offs

- **Pro**: Ship SDC support without 6+ months of protocol implementation
- **Pro**: BSD license — no copyleft concerns
- **Con**: Python dependency isolated to sidecar (no impact on main API)
- **Con**: `sdc11073` is not widely battle-tested in production

## Consequences

- SDC support is opt-in and reversible
- The sidecar is the only Python component in the stack
- If `sdc11073` proves insufficient, we can replace the sidecar internals
  without changing the API contract
- Waveform data (high-frequency) may need rate limiting or downsampling
  before ingest — configurable in the sidecar
