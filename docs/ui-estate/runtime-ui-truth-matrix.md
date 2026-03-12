# Runtime UI Truth Matrix

Generated: 2026-03-12T06:16:28.294Z

## Purpose

This matrix converts the runtime UI checklist into an evidence-seeded first-pass truth posture.
It is not a completion certificate. It is the starting point for manual review and live verification.

## Summary

- Total surfaces: 131
- Required surfaces: 29
- Surfaces with action signals: 41
- Surfaces with package signals: 51
- Surfaces with route evidence: 51
- Surfaces with E2E hints: 15
- Surfaces with at least one certified package hint: 51

## Priority Split

- P1: 29
- P2: 33
- P3: 69

## Truth Buckets

- mixed-manual-review: 6
- mixed-unmapped: 34
- mixed-with-vista-signals: 33
- non-clinical-surface: 3
- non-vista-or-shell-surface: 26
- required-needs-live-verification: 13
- required-unmapped: 3
- required-with-strong-signals: 13

## P1 Required Surfaces

- web:/chart/:dfn/:tab | required-with-strong-signals | packages: dg, gmpl, gmra, gmv, lr, or, pso, sd, tiu | actions: 37 | route-tests: 120 | e2e: 0
- web:/cprs/admin/vista/billing | required-with-strong-signals | packages: arc, arj, fm, hl, ib, ibcn, prca, xq, xu, xus, xwb | actions: 3 | route-tests: 67 | e2e: 0
- web:/cprs/admin/vista/clinical-setup | required-needs-live-verification | packages: fm, hl, xq, xu, xus, xwb | actions: 0 | route-tests: 47 | e2e: 0
- web:/cprs/admin/vista/clinics | required-needs-live-verification | packages: fm, hl, xq, xu, xus, xwb | actions: 0 | route-tests: 47 | e2e: 1
- web:/cprs/admin/vista/dashboard | required-needs-live-verification | packages: fm, hl, xq, xu, xus, xwb | actions: 0 | route-tests: 47 | e2e: 0
- web:/cprs/admin/vista/facilities | required-needs-live-verification | packages: fm, hl, xq, xu, xus, xwb | actions: 0 | route-tests: 47 | e2e: 0
- web:/cprs/admin/vista/inventory | required-needs-live-verification | packages: fm, hl, xq, xu, xus, xwb | actions: 0 | route-tests: 47 | e2e: 0
- web:/cprs/admin/vista/lab | required-with-strong-signals | packages: fm, hl, lr, xq, xu, xus, xwb | actions: 3 | route-tests: 47 | e2e: 0
- web:/cprs/admin/vista/pharmacy | required-needs-live-verification | packages: fm, hl, xq, xu, xus, xwb | actions: 0 | route-tests: 47 | e2e: 0
- web:/cprs/admin/vista/provisioning | required-needs-live-verification | packages: fm, hl, xq, xu, xus, xwb | actions: 0 | route-tests: 47 | e2e: 0
- web:/cprs/admin/vista/quality | required-needs-live-verification | packages: fm, hl, xq, xu, xus, xwb | actions: 0 | route-tests: 47 | e2e: 0
- web:/cprs/admin/vista/radiology | required-with-strong-signals | packages: fm, hl, xq, xu, xus, xwb | actions: 1 | route-tests: 47 | e2e: 0
- web:/cprs/admin/vista/system | required-needs-live-verification | packages: fm, hl, xq, xu, xus, xwb | actions: 0 | route-tests: 47 | e2e: 0
- web:/cprs/admin/vista/users | required-with-strong-signals | packages: fm, hl, xq, xu, xus, xwb | actions: 1 | route-tests: 47 | e2e: 0
- web:/cprs/admin/vista/wards | required-with-strong-signals | packages: fm, hl, xq, xu, xus, xwb | actions: 3 | route-tests: 47 | e2e: 0
- web:/cprs/admin/vista/workforce | required-needs-live-verification | packages: fm, hl, xq, xu, xus, xwb | actions: 0 | route-tests: 47 | e2e: 0
- web:/cprs/chart/:dfn/:tab | required-with-strong-signals | packages: dg, gmpl, gmra, gmv, lr, or, pso, sd, tiu | actions: 37 | route-tests: 120 | e2e: 0
- web:/cprs/emar | required-with-strong-signals | packages: psb, psj, pso | actions: 2 | route-tests: 40 | e2e: 0
- web:/cprs/handoff | required-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/inbox | required-needs-live-verification | packages: none | actions: 7 | route-tests: 0 | e2e: 0
- web:/cprs/messages | required-needs-live-verification | packages: none | actions: 11 | route-tests: 0 | e2e: 0
- web:/cprs/nursing | required-needs-live-verification | packages: none | actions: 7 | route-tests: 0 | e2e: 0
- web:/cprs/patient-search | required-with-strong-signals | packages: dg, or | actions: 13 | route-tests: 40 | e2e: 0
- web:/cprs/scheduling | required-with-strong-signals | packages: sd | actions: 1 | route-tests: 20 | e2e: 1
- web:/cprs/vista-workspace | required-with-strong-signals | packages: dg, gmpl, gmra, gmv, lr, or, pso, sd, tiu | actions: 37 | route-tests: 120 | e2e: 0
- web:/encounter/note-builder | required-with-strong-signals | packages: tiu | actions: 6 | route-tests: 20 | e2e: 0
- web:/inpatient/bedboard | required-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/inpatient/census | required-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/patient-search | required-with-strong-signals | packages: dg, or | actions: 13 | route-tests: 40 | e2e: 0

## High-Confidence Required Signals

- web:/chart/:dfn/:tab | required-with-strong-signals | packages: dg, gmpl, gmra, gmv, lr, or, pso, sd, tiu | actions: 37 | route-tests: 120 | e2e: 0
- web:/cprs/admin/vista/billing | required-with-strong-signals | packages: arc, arj, fm, hl, ib, ibcn, prca, xq, xu, xus, xwb | actions: 3 | route-tests: 67 | e2e: 0
- web:/cprs/admin/vista/lab | required-with-strong-signals | packages: fm, hl, lr, xq, xu, xus, xwb | actions: 3 | route-tests: 47 | e2e: 0
- web:/cprs/admin/vista/radiology | required-with-strong-signals | packages: fm, hl, xq, xu, xus, xwb | actions: 1 | route-tests: 47 | e2e: 0
- web:/cprs/admin/vista/users | required-with-strong-signals | packages: fm, hl, xq, xu, xus, xwb | actions: 1 | route-tests: 47 | e2e: 0
- web:/cprs/admin/vista/wards | required-with-strong-signals | packages: fm, hl, xq, xu, xus, xwb | actions: 3 | route-tests: 47 | e2e: 0
- web:/cprs/chart/:dfn/:tab | required-with-strong-signals | packages: dg, gmpl, gmra, gmv, lr, or, pso, sd, tiu | actions: 37 | route-tests: 120 | e2e: 0
- web:/cprs/emar | required-with-strong-signals | packages: psb, psj, pso | actions: 2 | route-tests: 40 | e2e: 0
- web:/cprs/patient-search | required-with-strong-signals | packages: dg, or | actions: 13 | route-tests: 40 | e2e: 0
- web:/cprs/scheduling | required-with-strong-signals | packages: sd | actions: 1 | route-tests: 20 | e2e: 1
- web:/cprs/vista-workspace | required-with-strong-signals | packages: dg, gmpl, gmra, gmv, lr, or, pso, sd, tiu | actions: 37 | route-tests: 120 | e2e: 0
- web:/encounter/note-builder | required-with-strong-signals | packages: tiu | actions: 6 | route-tests: 20 | e2e: 0
- web:/patient-search | required-with-strong-signals | packages: dg, or | actions: 13 | route-tests: 40 | e2e: 0

## Unmapped Surfaces

- web:/cprs/admin/alignment | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/audit-viewer | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/branding | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/break-glass | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/capability-matrix | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/certification | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/compliance | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/contracting-hub | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/exports | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/hmo-portal | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/loa-workbench | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/migration | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/onboarding | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/ops | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/performance | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/ph-market | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/philhealth-setup | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/pilot | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/qa-dashboard | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/service-lines | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/support | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/templates | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/terminal | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/vista-admin | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/admin/workflows | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/cprs/handoff | required-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/inpatient/bedboard | required-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- web:/inpatient/census | required-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- portal:/dashboard/health | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- mobile:HomeScreen | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- mobile:ModuleScreen | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- mobile:MoreScreen | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- mobile:PatientScreen | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- mobile:ScanScreen | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- desktop:apps/desktop/main.js | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- desktop:apps/desktop/preload.js | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0
- desktop:apps/desktop/splash.html | mixed-unmapped | packages: none | actions: 0 | route-tests: 0 | e2e: 0

