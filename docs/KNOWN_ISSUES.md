# Known Issues Registry

| ID | Module | Description | Severity | Status |
| --- | ------ | ----------- | -------- | ------ |
| KI-001 | VistA RPC | ZVEADT WARDS RPC causes socket crash cascade — M routine error on ward enumeration disconnects the broker, failing all subsequent RPCs in the same session | HIGH | Open |
| KI-002 | VistA Interop | VE INTEROP HL7 MSGS, VE INTEROP HLO STATUS, VE INTEROP HLO QUEUE DEPTH RPCs missing from VEHU — custom ZVEMIOP.m routines not installed or entry points not registered | MEDIUM | Open — run install-vista-routines.ps1 |
| KI-003 | QA/Security | G3 secret scan flags hardcoded creds in `.github/workflows/ci.yml` (redis URL) and `scripts/restart-drill.mjs` (PROV123 default) — WARN only, not blocking | LOW | Open |
| KI-004 | VistA RPC | 23 of 87 probed RPCs return empty/missing — expected for sandbox (WorldVistA VEHU has limited synthetic data for IB/PRCA/Radiology subsystems) | INFO | Expected |
