# VistA Evolved

![CI](https://github.com/VistA-Evolved/VistA-Evolved/actions/workflows/ci.yml/badge.svg)

Modern browser-based EHR built on proven VistA clinical logic.

## What this is

VistA Evolved is a modern React + Node.js platform that wraps VistA/YottaDB with browser-based workflows and modern APIs.

## Where the project is managed

- Notion: Company HQ → VistA Evolved HQ (roadmap, ADRs, features, notes)
- GitHub: source code + technical runbooks + implementation artifacts

## Current MVP scope (first demo)

Patient Search → Allergies → Vitals  
(Not in MVP: Scheduling, CPOE/Orders)

## Repo structure

- `apps/web` — Browser UI (React)
- `apps/api` — API server (Node.js)
- `services/vista` — VistA/YottaDB environment (containers + scripts)
- `docs` — architecture, decisions, runbooks
- `scripts` — helper scripts and automation

## Docker Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- At least 6 GB RAM allocated to Docker (VistA alone needs ~2 GB)

### Quick Start

```bash
# 1. Create your .env file from the template
cp .env.example .env

# 2. Edit .env — at minimum set POSTGRES_PASSWORD and VistA credentials
#    WorldVistA Docker default: VISTA_ACCESS_CODE=PROV123, VISTA_VERIFY_CODE=PROV123!!
nano .env

# 3. Start everything
docker compose up --build
```

Or use the helper scripts:

```bash
./scripts/dev-start.sh    # checks Docker, creates .env if needed, starts all services
./scripts/dev-stop.sh     # stops all services
./scripts/dev-logs.sh     # tails logs from all services
./scripts/dev-logs.sh api # tails logs from a specific service
```

### Services

| Service  | Container      | Port                   | Description                     |
| -------- | -------------- | ---------------------- | ------------------------------- |
| vista    | vista-ehr      | 9210 (RPC), 8001 (Web) | VistA EHR backend               |
| postgres | vista-postgres | 5432                   | PostgreSQL 15 platform database |
| redis    | vista-redis    | 6379                   | Redis 7 cache                   |
| api      | vista-api      | 4000                   | Fastify API server              |
| web      | vista-web      | 5173                   | Next.js CPRS clinician UI       |

### Verify Services

```bash
# Check all 5 services are configured
docker compose config --services

# Validate compose syntax
docker compose config --quiet && echo 'VALID'

# Start just infrastructure
docker compose up -d postgres redis
docker compose ps

# Check API health (after full startup)
curl http://localhost:4000/health
```

### Volumes

Data is persisted in named Docker volumes:

- `vista-evolved-ehr-data` — VistA globals
- `vista-evolved-pg-data` — PostgreSQL data
- `vista-evolved-redis-data` — Redis data

Stop without data loss: `docker compose down`
Stop and delete all data: `docker compose down -v`

## Contributing (early stage)

- Decisions are logged in Notion ADRs first, then summarized in `docs/decisions/` as needed.
- Features are defined in Notion Features backlog with a Feature Spec template.
