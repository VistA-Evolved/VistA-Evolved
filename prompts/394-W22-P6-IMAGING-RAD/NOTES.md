# Phase 394 -- W22-P6: Imaging/Radiology Deep Workflows -- NOTES

## Design Decisions

- **Separate `/radiology/*` routes from existing `/imaging/*`**: The 33+ existing
  imaging endpoints (Phases 18C/22/23/24/81/386) handle infrastructure (DICOMweb
  proxy, Orthanc ingest, device registry, RBAC/audit). The new `/radiology/*`
  endpoints handle clinical workflows (orders, protocols, reading, reports, dose,
  peer review). This avoids collision and keeps concerns separated.
- **9-state rad order FSM** tracks the full lifecycle: ordered -> protocoled ->
  scheduled -> in_progress -> completed -> reported -> verified.
- **Reading worklist is radiologist-focused**: Unlike the Phase 23 worklist
  (ordering side), this tracks unread studies, reader assignment, turnaround
  times, and priority escalation.
- **Report lifecycle includes resident flow**: draft -> preliminary (resident
  signs) -> final (attending verifies). Addendum and amendment states supported.
- **DRL comparison**: 7 diagnostic reference level thresholds for CT, CR, MG,
  RF modalities. Auto-evaluates on dose recording.
- **ACR critical finding communication**: Deadlines by category: emergent=15min,
  urgent=30min, unexpected=60min. Tracks communication method (verbal, phone,
  secure message, in-person) per ACR Practice Parameters.
- **RADPEER 4-point scoring**: 1=Concur, 2=Minor discrepancy, 3=Clinically
  significant (no adverse outcome), 4=Clinically significant (adverse outcome).

## Wave 21 Bridging

- `RadOrder.mwlWorklistItemId` links to Phase 386 MWL WorklistItem
- `RadOrder.mppsRecordId` links to Phase 386 MppsRecord
- `DoseRegistryEntry.mppsRecordId` links dose data to MPPS records
- Bridging is via REST POST (link-mwl, link-mpps endpoints), not automatic

## Existing Infra Preserved

- Phase 23 worklist (`/imaging/worklist/*`) -- unchanged
- Phase 24 audit/authz/devices -- unchanged
- Phase 386 MWL/MPPS/modality routes (`/devices/imaging/*`) -- unchanged
- Existing DICOMweb proxy and Orthanc ingest -- unchanged
