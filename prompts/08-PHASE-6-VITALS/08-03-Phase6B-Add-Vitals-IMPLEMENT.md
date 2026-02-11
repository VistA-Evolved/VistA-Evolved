# Phase 6B — Add Vitals (IMPLEMENT)

Goal:
POST /vista/vitals creates a vitals entry via GMV ADD VM RPC and UI refreshes.

Rules:
- Do not change broker protocol.
- Validate inputs.
- Use FileMan date format correctly.
- Do not commit secrets.

Must include vital type map (as implemented):
BP=1, T=2, R=3, P=5, HT=8, WT=9, PO2=21, PN=22

RPC behavior:
- Build GMVDATA string correctly and call GMV ADD VM.

Deliverables:
- POST /vista/vitals works
- UI form works and refreshes list
- Runbook: docs/runbooks/vista-rpc-add-vitals.md
