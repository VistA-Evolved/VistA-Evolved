# Cutover Playbook

> Phase 461 (W30-P6) — Step-by-step guide for VistA-to-VistA-Evolved cutover.

## Prerequisites

- All recon discrepancies resolved or accepted (Phase 460)
- Dual-run match rate >99% for 24+ hours (Phase 459)
- Full VistA backup verified and restorable
- Rollback procedure tested (Phase 462)
- Cutover plan created via API

## Cutover Phases

### 1. Planning
- Create cutover plan: `POST /migration/recon/...` (data validation)
- Set target cutover date
- Notify all stakeholders
- Verify rollback scripts

### 2. Pre-Validation
Run pre-cutover gates:
```powershell
.\scripts\migration\cutover-gates.ps1 -Phase pre
```

Required gates:
- [ ] Recon discrepancies clean
- [ ] Dual-run stable (>99% match, 24h)
- [ ] VistA backup verified
- [ ] Rollback tested

### 3. Data Freeze
- Set VistA to read-only mode (coordinate with VistA admin)
- Drain all pending HL7 message queues
- Verify no in-flight transactions

### 4. Final Sync
- Run delta sync for any changes since last full sync
- Verify record counts match within tolerance
- Run final recon

### 5. Cutover Active
- Switch traffic to VistA-Evolved
- Monitor error rates
- Keep VistA available for rollback

### 6. Post-Validation
Run post-cutover gates:
```powershell
.\scripts\migration\cutover-gates.ps1 -Phase post
```

Required gates:
- [ ] Core workflow smoke tests pass
- [ ] Key users validate core functions
- [ ] No critical errors in logs

### 7. Completion
- Decommission VistA read-only instance (after cooling period)
- Archive cutover artifacts

## Rollback Procedure

If any post-validation gate fails:
1. Switch traffic back to VistA
2. Restore from backup if data was modified
3. Log rollback reason
4. Return to planning phase

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/migration/cutover/plan` | Create new cutover plan |
| GET | `/migration/cutover/plans` | List all plans |
| POST | `/migration/cutover/:id/advance` | Advance to next phase |
| POST | `/migration/cutover/:id/gate` | Update a gate |
| POST | `/migration/cutover/:id/rollback` | Trigger rollback |

## Notes

- Cutover state machine prevents skipping mandatory gates
- All transitions logged with timestamp and user
- In-memory tracking resets on API restart
- Admin-only access via AUTH_RULES
