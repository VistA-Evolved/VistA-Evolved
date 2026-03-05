# Billing Provider Readiness

> Phase 284 hardening — eliminates "silent mock billing" risk.

## Overview

The billing subsystem uses a pluggable provider model:

| Provider | Use case | `configuredForProduction` |
|----------|----------|--------------------------|
| `mock`   | Local dev / unit tests only | `false` |
| `lago`   | Demo, pilot, production (OSS self-hosted Lago) | `true` |

## Safety Rules

### Dev vs Demo vs Prod Rules

| Environment | `BILLING_PROVIDER` | Mock allowed? | Startup behavior | `/billing/health` |
|-------------|-------------------|---------------|------------------|--------------------|
| **dev** (default) | unset (mock) | Yes | Loud warning logged | `provider: "mock"`, `warnings: [...]` |
| **test** (CI) | unset (mock) | Yes | Loud warning logged | Same as dev |
| **demo** (`DEPLOYMENT_STAGE=demo`) | Must be `lago` | No | Fail-fast startup error | `provider: "lago"`, `warnings: []` |
| **pilot** (`DEPLOYMENT_STAGE=pilot`) | Must be `lago` | No | Fail-fast startup error | Same as demo |
| **rc** (`PLATFORM_RUNTIME_MODE=rc`) | Must be `lago` | No | Fail-fast startup error | Same as demo |
| **prod** (`PLATFORM_RUNTIME_MODE=prod`) | Must be `lago` | No | Fail-fast startup error | Same as demo |
| **production** (`NODE_ENV=production`) | Must be `lago` | No | Fail-fast startup error | Same as demo |

> **Rule:** If ANY of the three env vars (`NODE_ENV`, `PLATFORM_RUNTIME_MODE`,
> `DEPLOYMENT_STAGE`) indicates a non-dev environment, mock billing is
> forbidden. The check is OR-based, not AND-based.

### Mock is blocked in non-dev environments

The API **refuses to start** if the billing provider resolves to `mock` when
any of these conditions are true:

- `NODE_ENV=production`
- `PLATFORM_RUNTIME_MODE=rc` or `prod`
- `DEPLOYMENT_STAGE=demo`, `pilot`, or `prod`

The startup error includes:
- What is wrong
- Which env vars to set
- Example configuration

### Dev/test: loud warning

In `dev` or `test` mode, mock is allowed but a loud warning is logged at
startup so developers are aware billing is not real.

## Environment Configurations

### Local development (default)

```env
# No billing env vars needed — defaults to mock with a startup warning
# BILLING_PROVIDER=mock  (implicit default)
```

### Demo / Pilot

```env
BILLING_PROVIDER=lago
LAGO_API_URL=http://lago:3000
LAGO_API_KEY=your-lago-api-key
DEPLOYMENT_STAGE=demo
```

### Production

```env
BILLING_PROVIDER=lago
LAGO_API_URL=http://lago:3000
LAGO_API_KEY=your-lago-api-key
PLATFORM_RUNTIME_MODE=prod
# or: DEPLOYMENT_STAGE=prod
```

## Verifying with /billing/health

```bash
# Session-authenticated health check (any logged-in user)
curl -b cookies.txt http://localhost:3001/billing/health

# Admin health check (admin role required)
curl -b cookies.txt http://localhost:3001/admin/billing/health
```

### Response shape

```json
{
  "ok": true,
  "provider": "lago",
  "healthy": true,
  "configuredForProduction": true,
  "details": {
    "apiUrl": "http://lago:3000",
    "apiKeyConfigured": true,
    "reachable": true
  }
}
```

### Mock provider response

```json
{
  "ok": true,
  "provider": "mock",
  "healthy": true,
  "configuredForProduction": false,
  "runtimeMode": "dev",
  "mockForbiddenInCurrentMode": false,
  "warnings": [
    "Mock billing provider is active. NOT suitable for demo/pilot/production.",
    "Set BILLING_PROVIDER=lago and configure LAGO_API_URL + LAGO_API_KEY for real billing."
  ],
  "details": {
    "warning": "Mock billing provider is active. NOT suitable for demo/pilot/production.",
    "hint": "Set BILLING_PROVIDER=lago and configure LAGO_API_URL + LAGO_API_KEY for real billing."
  }
}
```

### Key fields

| Field | Meaning |
|-------|---------|
| `provider` | `"mock"` or `"lago"` |
| `healthy` | Provider is operational (mock: always true; lago: can reach API) |
| `configuredForProduction` | `false` for mock; `true` for lago with API key |
| `runtimeMode` | Current `PLATFORM_RUNTIME_MODE` value (dev/test/rc/prod) |
| `mockForbiddenInCurrentMode` | `true` if mock would be blocked in this mode |
| `warnings` | Array of warning strings (non-empty when mock is active) |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| API won't start: `BILLING MISCONFIGURATION` | Mock provider in non-dev env | Set `BILLING_PROVIDER=lago` + Lago credentials |
| `/billing/health` returns `configuredForProduction: false` | Using mock provider | Switch to lago |
| `/billing/health` returns `healthy: false` | Lago unreachable or bad API key | Check `LAGO_API_URL` and `LAGO_API_KEY` |
