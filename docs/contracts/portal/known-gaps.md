# Portal Known Gaps — Phase 27

## Live VistA Data (5 RPCs wired)

These sections return real data from VistA:

- ✅ Allergies (ORQQAL LIST)
- ✅ Problems (ORWCH PROBLEM LIST)
- ✅ Vitals (ORQQVI VITALS)
- ✅ Medications (ORWPS ACTIVE)
- ✅ Demographics (ORWPT SELECT)

## Integration Pending (5 RPCs identified, not wired)

These sections return `_integration: "pending"` with the exact target RPC:

- ⏳ Labs — `ORWLRR INTERIM` (complex date/test-type params)
- ⏳ Consults — `ORQQCN LIST` (not confirmed in sandbox)
- ⏳ Surgery — `ORWSR LIST` (not available in sandbox)
- ⏳ Discharge Summaries — `TIU DOCUMENTS BY CONTEXT` (class 244)
- ⏳ Clinical Reports — `ORWRP REPORT TEXT` (HS component selection)

## In-Memory Stores (3 services, VistA mapping documented)

These services use in-memory stores with documented 4-step migration paths:

### Messaging

- **Current:** In-memory Map store, CRUD fully functional
- **VistA target:** XMXAPI (send), XMXMSGS (list), TIU DOCUMENTS BY CONTEXT (clinical notes)
- **Migration steps:**
  1. Confirm XMXAPI/XMXMSGS RPC availability in target environment
  2. Map portal message CRUD to VistA MailMan RPCs
  3. Add dual-write (in-memory + VistA) with reconciliation
  4. Remove in-memory store, go VistA-native

### Appointments

- **Current:** Demo seed data + request flows (in-memory)
- **VistA target:** SD APPOINTMENT LIST, SD SCHEDULE APPOINTMENT, SDEC CANCEL APPT
- **Migration steps:**
  1. Confirm scheduling RPC availability (not in WorldVistA sandbox)
  2. Wire read path (SD APPOINTMENT LIST → appointment list)
  3. Wire request path through VistA scheduling
  4. Remove demo seed data

### Proxy Access

- **Current:** In-memory proxy relationships + sensitivity policy engine
- **VistA target:** DGMP (patient movement), DG SENSITIVE RECORD ACCESS, DG SECURITY LOG
- **Migration steps:**
  1. Map proxy relationships to File #2 (Patient) relationships
  2. Wire sensitivity checks to DG SENSITIVE RECORD ACCESS
  3. Log access to DG SECURITY LOG
  4. Remove in-memory store

## Feature Gaps

- **Messaging attachments:** Stored as base64 in memory only (5MB limit enforced)
- **MFA:** Stub + roadmap text shown. No TOTP/SMS implementation yet.
- **Notification delivery:** Email/SMS toggles saved but no actual delivery mechanism
- **Appointment scheduling:** Requests stored but no clinic confirmation workflow
- **Lab results:** Complex parameter requirements prevent simple RPC mapping
- **Telehealth:** Video visit placeholder only (Jitsi/WebRTC planned)
- **Medication refills:** UI placeholder only
- **PDF rendering:** Minimal text-only PDF (Courier font, basic layout)

## Security Considerations

- Share links use cryptographically strong tokens (24 bytes, base64url)
- Access codes exclude ambiguous characters (no I/O/0/1)
- Max 5 failed verification attempts before link lock
- All portal actions audited (21 distinct action types)
- No PHI in client-side logging
- Session-scoped DFN never exposed to client
