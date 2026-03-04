# Phase 155 — VistA Routine Install Automation (M Routines + RPC Registration)

## User Request

Close the "Custom M routines must be installed in Docker" gap by making routine
installation deterministic. Eliminate manual install steps.

## Non-Negotiables

- Do not change clinical behavior; just automate install
- Must work for dev sandbox and for production VistA distro lane
- Must be idempotent and safe to re-run

## Implementation Steps

1. Create unified installer script `scripts/install-vista-routines.ps1` that:
   - Copies all production ZVE\*.m routines into container
   - Runs each routine's INSTALL entry point
   - Adds RPCs to OR CPRS GUI CHART broker context
   - Verifies callable

2. Create provisioning verification endpoint:
   - `GET /vista/provision/status` (admin-only)
   - Reports which routines are installed, which RPCs registered

3. Create provisioning verification script:
   - `scripts/verify-phase155-provisioning.ps1`

4. Create runbook: `docs/runbooks/vista-provisioning.md`

5. Update AGENTS.md with Phase 155 architecture notes

## Target Routines (production only)

| Routine     | Installer Tag                               | RPCs Registered      |
| ----------- | ------------------------------------------- | -------------------- |
| ZVEMIOP.m   | RUN^ZVEMINS                                 | 6 VE INTEROP \* RPCs |
| ZVEMINS.m   | (is the installer)                          | —                    |
| VEMCTX3.m   | (context adder)                             | —                    |
| ZVEMSGR.m   | EN^ZVEMSIN                                  | 5 ZVE MAIL \* RPCs   |
| ZVEMSIN.m   | (is the installer)                          | —                    |
| ZVERPC.m    | INSTALL^ZVERPC                              | VE LIST RPCS         |
| ZVERCMP.m   | INSTALL^ZVERCMP                             | VE RCM PROVIDER INFO |
| ZVEADT.m    | INSTALL^ZVEADT                              | 3 ZVEADT \* RPCs     |
| ZVESDSEED.m | (optional seeder, not installed by default) | —                    |

## Files Touched

- `scripts/install-vista-routines.ps1` (NEW)
- `apps/api/src/routes/vista-provision.ts` (NEW)
- `apps/api/src/index.ts` (register provision routes)
- `scripts/verify-phase155-provisioning.ps1` (NEW)
- `docs/runbooks/vista-provisioning.md` (NEW)
- `AGENTS.md` (updated)

## Verification

- `scripts/verify-phase155-provisioning.ps1`
- TypeCheck clean, build clean, gauntlet fast PASS
