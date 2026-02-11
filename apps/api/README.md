# apps/api (Fastify)

Fastify API server for VistA Evolved. Provides health checks, VistA connectivity probes, and RPC-based endpoints.

## Endpoints

| Method | Path | Phase | Description |
|--------|------|-------|-------------|
| GET | /health | 1C | Returns `{"ok":true}` |
| GET | /vista/ping | 3 | TCP connectivity check to VistA RPC port |
| GET | /vista/default-patient-list | 4A | Calls ORQPT DEFAULT PATIENT LIST via RPC Broker |
| GET | /vista/patient-search?q=NAME | 4 | Patient search (stub — protocol not yet implemented) |

## Setup

```powershell
pnpm -C apps/api install
```

Copy `.env.example` to `.env.local` and fill in credentials:
```powershell
cp apps/api/.env.example apps/api/.env.local
```

### WorldVistA Docker sandbox credentials

The `worldvista/worldvista-ehr` Docker image ships with these built-in accounts
(documented on [Docker Hub](https://hub.docker.com/r/worldvista/worldvista-ehr)):

| Access Code | Verify Code | User | Role |
|-------------|-------------|------|------|
| PROV123 | PROV123!! | PROVIDER,CLYDE WV (DUZ 87) | Provider |
| PHARM123 | PHARM123!! | PHARMACIST,LINDA WV | Pharmacist |
| NURSE123 | NURSE123!! | NURSE,HELEN WV | Nurse |

Put the access/verify codes into `apps/api/.env.local` — see `.env.example` for
the template. **Never commit `.env.local`** (it is in `.gitignore`).

## Run (development, with watch)

```powershell
pnpm -C apps/api dev
```

## Run (one-shot, no watch)

```powershell
pnpm -C apps/api start
```

## Test

```powershell
curl http://127.0.0.1:3001/health -UseBasicParsing
```

