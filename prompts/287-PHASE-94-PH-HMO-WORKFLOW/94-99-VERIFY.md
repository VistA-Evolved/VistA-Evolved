# Phase 94 VERIFY -- PH HMO Workflow Automation

## Verification Steps

### Automated

```powershell
cd apps\api; npx tsc --noEmit
.\scripts\vista-first-audit.ps1
```

### Manual Verification

1. **LOA Domain** -- `apps/api/src/rcm/loa/`
   - [ ] LOA types match spec (patient ref, encounter, codes, payer, attachments)
   - [ ] In-memory store with proper lifecycle (draft -> submitted -> approved/denied)
   - [ ] VistA source mapping for each field
   - [ ] Packet generation delegates to Phase 93 adapter

2. **Claims Workflow** -- `apps/api/src/rcm/workflows/`
   - [ ] Wraps existing claim-store (not duplicate)
   - [ ] Submission modes: manual/portal/email
   - [ ] Integration-pending surfaced for missing VistA IB data

3. **Remittance Intake** -- `apps/api/src/rcm/workflows/`
   - [ ] Secure upload + tag + associate flow
   - [ ] Minimal metadata storage
   - [ ] Payment posting assist with underpayment flagging

4. **Payer Rulepacks** -- `data/payers/ph-hmo-rulepacks.json`
   - [ ] No fabricated data -- unknown fields marked as such
   - [ ] Evidence references for any claimed data

5. **VistA Source Map** -- `apps/api/src/rcm/workflows/vista-source-map.ts`
   - [ ] Every workflow field mapped to VistA source or "integration-pending"
   - [ ] Target RPC/routine documented for pending fields

6. **UI Pages** -- 3 workbench pages
   - [ ] LOA Workbench: list + create + detail + checklist
   - [ ] Claims Workbench: status board + packet generator
   - [ ] Remittance Intake: upload + tag + payment posting

7. **Wiring**
   - [ ] Routes in index.ts
   - [ ] Nav entries in admin layout
   - [ ] All fetches use credentials:'include'

8. **Security**
   - [ ] No credentials in new files
   - [ ] No fabricated external URLs
   - [ ] Audit trail entries for LOA + remittance actions

## Expected Output

```
TypeScript: 0 errors
Audit: 15+ PASS, 0 FAIL
```
