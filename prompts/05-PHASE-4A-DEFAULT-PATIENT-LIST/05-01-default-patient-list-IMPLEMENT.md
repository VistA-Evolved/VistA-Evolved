# Phase 4A — Default Patient List RPC (IMPLEMENT)

Goal:
Implement /vista/default-patient-list returning real data via RPC Broker.

Rules:
- never invent protocol
- secrets only in .env.local (untracked)
- commit .env.example (schema)
- add VISTA_DEBUG=true safe debug logging

Protocol requirements (must be implemented exactly):
- TCPConnect accepted
- RPC message framing: 11302 requires bytes \x01 then "1" between prefix and SPack(rpcName)
- EOT delimiter: \x04
- Cipher pads must be extracted from XUSRB1.m Z tag:
  20 pads, 94 chars each
- Cipher algorithm must match ENCRYP^XUSRB1:
  - choose idIdx and assocIdx in range 1–20 and distinct
  - front byte chr(idIdx+31)
  - translate (including spaces)
  - end byte chr(assocIdx+31)

RPC sequence:
- TCPConnect
- XUS SIGNON SETUP
- XUS AV CODE (encrypted)
- XWB CREATE CONTEXT (encrypted, context "OR CPRS GUI CHART")
- ORQPT DEFAULT PATIENT LIST

Docs:
- docs/runbooks/vista-rpc-default-patient-list.md
- AGENTS.md updated with fixes summary
