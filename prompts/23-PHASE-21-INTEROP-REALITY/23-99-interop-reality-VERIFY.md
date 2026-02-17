# Phase 21 VERIFY — VistA HL7/HLO Interop Telemetry

## Gates

### G0 — M Routine Installed
```bash
docker exec wv mumps -run %XCMD 'D LINKS^ZVEMIOP(.R,20) W $O(R(""))'
```
Expect: returns "1" (first result line key).

### G1 — RPCs Registered
```bash
docker exec wv mumps -run %XCMD 'S X="" F  S X=$O(^DIC(8994,"B",X)) Q:X=""  I X["VE INTEROP" W X,!'
```
Expect: 4 RPCs listed (VE INTEROP HL7 LINKS, VE INTEROP HL7 MSGS, VE INTEROP HLO STATUS, VE INTEROP QUEUE DEPTH).

### G2 — API hl7-links responds
```powershell
curl.exe -s -c c.txt http://127.0.0.1:3001/auth/login -X POST -H "Content-Type: application/json" -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'
curl.exe -s -b c.txt http://127.0.0.1:3001/vista/interop/hl7-links?max=5 --max-time 15
```
Expect: `{"ok":true,"source":"vista","available":true,"count":5,"links":[...]}`.

### G3 — API hl7-messages responds
```powershell
curl.exe -s -b c.txt http://127.0.0.1:3001/vista/interop/hl7-messages --max-time 15
```
Expect: `{"ok":true,...,"stats":{"total":...}}`.

### G4 — API hlo-status responds
```powershell
curl.exe -s -b c.txt http://127.0.0.1:3001/vista/interop/hlo-status --max-time 15
```
Expect: `{"ok":true,...,"hloStatus":{"system":{"domain":"HL7.BETA.VISTA-OFFICE.ORG",...}}}`.

### G5 — API queue-depth responds
```powershell
curl.exe -s -b c.txt http://127.0.0.1:3001/vista/interop/queue-depth --max-time 15
```
Expect: `{"ok":true,...,"queues":{...}}`.

### G6 — API summary aggregates all 4
```powershell
curl.exe -s -b c.txt http://127.0.0.1:3001/vista/interop/summary --max-time 30
```
Expect: `{"ok":true,"source":"vista","elapsedMs":...,"hl7":{...},"hlo":{...},"queues":{...}}`.

### G7 — UI TypeScript compiles
```powershell
pnpm -C apps/web exec tsc --noEmit
```
Expect: exit 0.

### G8 — API TypeScript compiles
```powershell
pnpm -C apps/api exec tsc --noEmit
```
Expect: exit 0.

### G9 — CI verify.yml exists
```powershell
Test-Path .github/workflows/verify.yml
```
Expect: True.

### G10 — EADDRINUSE handling
```powershell
grep -c "EADDRINUSE" apps/api/src/index.ts
```
Expect: ≥1.

### G11 — Interop tab in UI
```powershell
grep -c "hl7hlo" apps/web/src/app/cprs/admin/integrations/page.tsx
```
Expect: ≥3.
