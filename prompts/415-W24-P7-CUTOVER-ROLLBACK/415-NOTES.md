# Phase 415 — W24-P7 Notes

- Cutover template integrates with all prior W24 phases (UAT, migration, cert)
- Rollback has 6 explicit trigger criteria including patient safety events
- DR rehearsal ties to `infra/environments/dr-validate.yaml` from P2
- Rollback uses `backup-restore.mjs restore --yes` with hash verification
- 7-day minimum gap between rollback and re-cutover attempt
