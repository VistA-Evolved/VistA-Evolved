# ADR: Progressive Delivery Choice

**Status:** Accepted
**Date:** 2025-07-22
**Phase:** 238 (Wave 6 P1)

## Context

VistA-Evolved needs a progressive delivery strategy for safe production rollouts.
Current state:

- **rollout-fleet.ps1** (304 lines): Multi-cluster sequential rollout script with
  health checks, pause/resume, and rollback capability
- **canary-check.ps1** (151 lines): Canary deployment verifier with configurable
  thresholds (error rate, latency, success percentage)
- **Helm charts**: `ve-shared` (library chart) + `ve-tenant` (per-tenant deployable)
  in `infra/helm/`
- **ArgoCD apps**: Application manifests in `infra/argocd/` with `YOUR-ORG` placeholders
- **kind-up.ps1**: Local Kind cluster bootstrap script

**What is missing:**

- ArgoCD uses placeholder org — not connected to real clusters
- No Argo Rollouts CRDs or canary/blue-green strategy objects
- No automated canary analysis (manual script-driven only)
- No integration with observability stack for metric-based promotion

## Decision

**Keep the existing script-driven canary approach (rollout-fleet.ps1 +
canary-check.ps1) and enhance it with Prometheus metric integration.** Defer
Argo Rollouts adoption until a real K8s cluster is operational.

Rationale:

- The current scripts already implement the core canary pattern
- Argo Rollouts requires a running cluster with CRDs — we don't have one yet
- Script-based approach works with any K8s provider (EKS, AKS, GKE, Kind)
- Adding Prometheus metric queries to canary-check.ps1 gives automated analysis
- When a cluster is ready, migrating to Argo Rollouts is a config change, not
  an architecture change (same Helm charts, same metrics)

## Alternatives Considered

| Option                      | License    | Pros                                | Cons                                        |
| --------------------------- | ---------- | ----------------------------------- | ------------------------------------------- |
| **Argo Rollouts**           | Apache-2.0 | Native K8s, metric-driven promotion | Requires running cluster + CRDs             |
| **Flagger**                 | Apache-2.0 | Mesh-agnostic, Prometheus native    | Requires service mesh or ingress controller |
| **Spinnaker**               | Apache-2.0 | Full CD platform                    | Massive operational overhead                |
| **Script-driven (current)** | N/A        | Works now, portable                 | Manual, no built-in metric analysis         |
| **Script-driven + metrics** | N/A        | Works now, automated analysis       | Still not native K8s object                 |

## Consequences

**Positive:**

- No new infrastructure dependencies
- Works immediately with current tooling
- Prometheus integration adds automated go/no-go decisions
- Migration path to Argo Rollouts is clear and incremental

**Negative:**

- Not declarative K8s-native (scripts vs CRDs)
- Requires PowerShell runtime on CI/CD runner
- Less ecosystem tooling integration than Argo Rollouts

## Security / PHI Notes

- Canary deployments must maintain session affinity to prevent PHI leakage
  between canary and stable pods
- Rollback must not lose in-flight VistA RPC connections
- Metrics used for promotion must not contain PHI (use sanitized route labels)

## Ops Notes

- Canary threshold defaults: error rate < 1%, p99 latency < 2s, success > 99%
- Rollout script supports `--DryRun` mode for plan verification
- Add Prometheus query to canary-check.ps1 via `CANARY_METRICS_URL` env var
- Future: `kubectl apply -f argo-rollout.yaml` when cluster is ready
