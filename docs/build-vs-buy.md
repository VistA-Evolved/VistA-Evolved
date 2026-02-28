# Build-vs-Buy Ledger -- VistA-Evolved

**Last Updated:** 2026-02-28
**Policy:** OSS-first. Prefer mature, actively maintained OSS tools with
permissive licenses (MIT/Apache-2.0). Only consider paid/proprietary tools
when no suitable OSS alternative exists.

## Supply Chain & Security

| Area | Existing in Repo? | Use OSS? | Chosen Tool | License | Rationale |
|------|-------------------|----------|-------------|---------|-----------|
| SBOM generation | Yes (Syft + CycloneDX) | Yes | **Syft** (Anchore) | Apache-2.0 | Already in CI via supply-chain-attest.yml; CycloneDX fallback in generate-sbom.ps1 |
| Container/image scanning | Yes (Trivy in cd-deploy) | Yes | **Trivy** (Aqua) | Apache-2.0 | Already integrated in CI; covers images, filesystem, IaC |
| Vuln scan from SBOM | No | Yes | **Grype** (Anchore) | Apache-2.0 | Complements Trivy; consumes Syft SBOM directly; SARIF output for GitHub integration |
| Supply chain scorecard | No | Yes | **OpenSSF Scorecard** | Apache-2.0 | Industry standard for repo security posture; GitHub Action available |
| Code scanning (SAST) | Yes (CodeQL) | Yes | **CodeQL** (GitHub) | MIT (queries) | Already in .github/workflows/codeql.yml |
| Image signing | Yes (cosign, disabled) | Yes | **cosign** (Sigstore) | Apache-2.0 | In supply-chain-attest.yml, COSIGN_ENABLED=false; enable when ready |
| License compliance | No | Yes | **Trivy** license scan | Apache-2.0 | Can scan SBOM for license violations; add policy file |

## Testing & Quality

| Area | Existing in Repo? | Use OSS? | Chosen Tool | License | Rationale |
|------|-------------------|----------|-------------|---------|-----------|
| E2E testing | Yes (41+ Playwright specs) | Yes | **Playwright** (Microsoft) | Apache-2.0 | Already extensive; apps/web/e2e/ with auth setup, domain journeys |
| Unit/integration tests | Yes (Vitest) | Yes | **Vitest** | MIT | Already used for API + FHIR tests |
| Load testing | Yes (10 k6 scripts) | Yes | **k6** (Grafana Labs) | AGPL-3.0 | Already in tests/k6/; AGPL acceptable as dev tool (not distributed) |
| API contract testing | Partial (FHIR tests) | Yes | **Vitest** + **ajv** | MIT | Use existing test runner with JSON Schema validation |
| RPC contract testing | No (record/replay) | Yes | **Vitest** + custom harness | MIT | Build thin harness over existing rpcBrokerClient; sanitized fixtures |

## Infrastructure & Operations

| Area | Existing in Repo? | Use OSS? | Chosen Tool | License | Rationale |
|------|-------------------|----------|-------------|---------|-----------|
| Progressive delivery | Partial (script-driven canary) | Yes | **Argo Rollouts** | Apache-2.0 | ADR already chose this for K8s; not yet deployed |
| K8s backup/restore | Partial (PG-only via dr-nightly) | Yes | **Velero** (VMware) | Apache-2.0 | ADR-dr-backup-choice.md selected Velero for K8s PV backup |
| Observability | Yes (OTel + Jaeger + Prometheus) | Yes | **OpenTelemetry** stack | Apache-2.0 | Phase 36; OTel Collector + Jaeger + Prometheus + Grafana |
| Secret management | Partial (SOPS+age dev) | Yes | **External Secrets Operator** | Apache-2.0 | ADR selected for prod; SOPS+age for dev |
| Container runtime | Yes (Docker Compose) | Yes | **Docker** / **Podman** | Apache-2.0 | Standard; Helm charts for K8s deployment |

## Build & CI

| Area | Existing in Repo? | Use OSS? | Chosen Tool | License | Rationale |
|------|-------------------|----------|-------------|---------|-----------|
| CI/CD pipeline | Yes (13 GitHub Actions workflows) | Yes | **GitHub Actions** | N/A (platform) | Deeply integrated; no reason to change |
| Package management | Yes (pnpm) | Yes | **pnpm** | MIT | Workspace-native monorepo support |
| TypeScript build | Yes (tsc) | Yes | **TypeScript** | Apache-2.0 | Standard |
| Linting | Yes (ESLint) | Yes | **ESLint** | MIT | Standard |

## Not Used / Rejected

| Tool | Reason |
|------|--------|
| Snyk | Commercial; Trivy + Grype cover the same ground with OSS |
| SonarQube | Heavy; CodeQL + ESLint sufficient for current scale |
| Cypress | Playwright already deeply integrated; no migration value |
| JMeter | k6 already integrated; better DX for CI |
| Istio (service mesh) | Premature; system is monolith + sidecar, not microservices |
