# Phase 180 -- Docker Image Contracts

## Implementation Steps
1. Create multi-stage Dockerfiles for api, web, portal
2. Define build args for version pinning
3. Add .dockerignore files to minimize context
4. Ensure no credentials baked into images

## Files Touched
- apps/api/Dockerfile
- apps/web/Dockerfile
- apps/portal/Dockerfile

## Source
- Derived from wave playbook decomposition (Q213-Q215)
- Original phase specification in wave mega-document
- Enriched by Q219 audit to meet quality floor

## Dependencies
- Requires completion of prior phases in the wave sequence
- See wave playbook for cross-phase dependencies
