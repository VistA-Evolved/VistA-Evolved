# Phase 4A — Protocol Fix (IMPLEMENT)

Use only if Phase 4A fails with "Job ended" or sign-on setup fails.

Mandatory checks:
- confirm xinetd listening on 9430 inside container:
  docker exec -it wv sh -lc "ss -lntp | grep 9430 || netstat -an | grep 9430"

Fix checklist:
1) Ensure 11302 framing includes \x01 and "1"
2) Ensure cipher pads are correct (XUSRB1.m Z tag)
3) Ensure cipher indices placement (+31) and spaces translated

After fix:
- rerun scripts/verify-phase1-to-phase4a.ps1
Must be 0 FAIL.
