# 488-01 IMPLEMENT -- W33-P8: UI Hardening (Tier-0 Status Awareness)

## Goal

Make the web frontend aware of both `"unsupported-in-sandbox"` and
`"integration-pending"` API statuses. All UI status checks, badges,
filters, and display text must handle the new status cleanly.

## Files to Change

| File                                                       | Change                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| `apps/web/src/actions/actionRegistry.ts`                   | Add `"unsupported-in-sandbox"` to `ActionStatus` union |
| `apps/web/src/components/cprs/ActionInspector.tsx`         | Add color entry for new status                         |
| `apps/web/src/components/cprs/IntegrationPendingModal.tsx` | Show contextual title based on status                  |
| `apps/web/src/components/cprs/panels/RpcDebugPanel.tsx`    | Add new status to local type + filter + badge          |
| `apps/web/src/components/cprs/panels/OrdersPanel.tsx`      | Handle `unsupported-in-sandbox` in sign response       |
| `apps/web/src/components/cprs/panels/NursingPanel.tsx`     | Handle `unsupported-in-sandbox` in flowsheet text      |
| `apps/web/src/app/cprs/inpatient/page.tsx`                 | Handle new status in pending modal                     |
| `apps/web/src/app/cprs/emar/page.tsx`                      | Handle new status in admin + scan result display       |

## Rules

- Minimal edits -- add `|| status === 'unsupported-in-sandbox'` branches
- New status uses blue/indigo palette (distinct from amber pending)
- Display text: "Unsupported in Sandbox" (not "Integration Pending")
- No architecture changes, no new components
