# Phase 487 Notes

- ORWOR1 SIG, ORWDXC ACCEPT, ORWORR AGET are all present in VistA — these
  should only return unsupported-in-sandbox if the capability cache disagrees
- Sign endpoint already has complex esCode validation + PG logging — only
  the final fallback path is modified
- Order-checks also has real RPC path — only the fallback is modified
