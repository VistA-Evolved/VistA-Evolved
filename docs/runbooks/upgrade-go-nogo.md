# Upgrade Go/No-Go Runbook

> Phase 455 (W29-P9) — Human checklist + sign-off for VistA upstream upgrades.

## Pre-Flight (Automated)

Run the automated checklist:

```powershell
pwsh scripts/patch-train/go-nogo-checklist.ps1 -TrainId 2025-03
```

This checks: release manifest, SBOM, license policy, upstream pinning,
compat lanes, runbooks, component inventory, dashboard adapter, RPC registry.

## Human Review Checklist

| # | Item | Owner | Done? |
|---|------|-------|-------|
| 1 | Automated go-nogo-checklist.ps1 passes | DevOps | [ ] |
| 2 | Compat matrix ran against 2+ lanes | DevOps | [ ] |
| 3 | License review for new/changed deps | Legal/Eng | [ ] |
| 4 | Clinical workflows tested on staging | QA | [ ] |
| 5 | Performance regression check | DevOps | [ ] |
| 6 | Rollback plan documented | DevOps | [ ] |
| 7 | Stakeholder notification sent | PM | [ ] |

## Sign-Off

| Field | Value |
|-------|-------|
| Train ID | __________ |
| Date | __________ |
| Reviewer | __________ |
| Decision | GO / NO-GO |
| Automated Score | __/9 |
| Notes | __________ |

### Sign-Off Procedure

1. Complete all items in the Human Review Checklist
2. Run `go-nogo-checklist.ps1` and capture the artifact
3. Fill in the Sign-Off section above
4. Promote with: `pwsh scripts/patch-train/promote.ps1 -From staging -To production`
5. Save sign-off as `artifacts/patch-train/<train-id>/sign-off.md`

## Rollback

If production issues are discovered within 48h:

1. Revert to previous Docker image tag
2. Reinstall previous routines: `pwsh scripts/install-vista-routines.ps1`
3. Verify: `pwsh scripts/verify-latest.ps1`
4. Document incident in `artifacts/patch-train/<train-id>/rollback-report.md`
