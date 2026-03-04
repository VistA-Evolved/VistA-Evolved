# Phase 2 — VistA Sandbox (IMPLEMENT)

Goal:
Start Docker sandbox reliably and expose RPC Broker on 9430.

Compose requirements:

- services/vista/docker-compose.yml
- service: wv
- image: worldvista/worldvista-ehr:latest
- ports: 2222, 9430, 8001, 8080, 9080
- profiles: ["dev"]
- restart: unless-stopped
- avoid fragile healthchecks (unless CMD-SHELL proven)

Windows EOF recovery:

- restart Docker Desktop
- docker builder prune -f
- retry docker pull

Docs:

- docs/runbooks/local-vista-docker.md
- docs/runbooks/phase2-docker-fix.md

Success:

- docker ps shows wv running
- Test-NetConnection 127.0.0.1 -Port 9430 True
