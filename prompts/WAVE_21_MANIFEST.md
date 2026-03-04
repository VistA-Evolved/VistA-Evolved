# Wave 21 — Device + Modality Integration Platform

> Edge gateway patterns, multi-protocol device ingest (HL7 v2, ASTM, POCT1-A,
> DICOM, IEEE 11073 SDC, vendor REST), alarm pipelines, infusion safety,
> imaging workflow (MWL/MPPS), and normalization (LOINC/UCUM + UDI).
> Goal: become integration-grade for real hospital device connectivity.

## Phase Map

| Wave Phase | Resolved ID | Title                                            | Prompt Folder                  |
| ---------- | ----------- | ------------------------------------------------ | ------------------------------ |
| W21-P1     | 378         | Reservation + Manifest + OSS ADRs + Coverage Map | `378-W21-P1-MANIFEST-COVERAGE` |
| W21-P2     | 379         | Edge Device Gateway                              | `379-W21-P2-EDGE-GATEWAY`      |
| W21-P3     | 380         | Device Registry + Patient/Location Association   | `380-W21-P3-DEVICE-REGISTRY`   |
| W21-P4     | 381         | HL7 v2 Device/Lab Ingest (MLLP ORU/ORM)          | `381-W21-P4-HL7V2-INGEST`      |
| W21-P5     | 382         | ASTM + POCT1-A Ingest                            | `382-W21-P5-ASTM-POCT`         |
| W21-P6     | 383         | IEEE 11073 SDC Ingest                            | `383-W21-P6-SDC-INGEST`        |
| W21-P7     | 384         | Alarms Pipeline (IHE PCD ACM)                    | `384-W21-P7-ALARMS`            |
| W21-P8     | 385         | Infusion / BCMA Safety Bridge                    | `385-W21-P8-INFUSION-BCMA`     |
| W21-P9     | 386         | Imaging Modality Connectivity (DICOM + MWL/MPPS) | `386-W21-P9-IMAGING-MODALITY`  |
| W21-P10    | 387         | Normalization (LOINC/UCUM + Device Codes)        | `387-W21-P10-NORMALIZATION`    |
| W21-P11    | 388         | Device/Modality Certification Runner             | `388-W21-P11-CERT-RUNNER`      |

## ADR Index

| ADR                | Path                                           |
| ------------------ | ---------------------------------------------- |
| Edge Gateway       | `docs/decisions/ADR-W21-EDGE-GATEWAY.md`       |
| Integration Engine | `docs/decisions/ADR-W21-INTEGRATION-ENGINE.md` |
| Imaging Stack      | `docs/decisions/ADR-W21-IMAGING-STACK.md`      |
| SDC Posture        | `docs/decisions/ADR-W21-SDC-POSTURE.md`        |
| POCT/ASTM          | `docs/decisions/ADR-W21-POCT-ASTM.md`          |

## Dependencies & Run Order

```
P1 (manifest+ADRs) ─── P2 (edge gateway) ─── P3 (device registry)
                                           └── P4 (HL7 v2 ingest)
                                           └── P5 (ASTM/POCT ingest)
                                           └── P6 (SDC ingest, optional)
                        P3+P4+P5 ─── P7 (alarms pipeline)
                                  └── P8 (infusion/BCMA safety)
                        P2+P3 ─── P9 (imaging modality)
                        P4+P5+P6+P7 ─── P10 (normalization)
                        ALL ─── P11 (certification runner)
```

P1 is foundational. P2-P6 are independently buildable. P7-P10 aggregate upstream.
P11 runs the full certification suite.

## Scope

1. Edge device gateway with secure tunnel, buffering, plugin adapters
2. Device registry with patient/location/encounter association
3. HL7 v2 MLLP ingest (ORU/ORM) with ACK/NACK and fixture tests
4. ASTM + POCT1-A serial/TCP ingest with parser and normalization
5. IEEE 11073 SDC optional microservice with translation
6. IHE PCD ACM alarm pipeline with routing and acknowledgements
7. Infusion/BCMA safety bridge with right-6 checks and pump event staging
8. Imaging modality connectivity (DICOM + MWL/MPPS + DICOMweb viewer)
9. LOINC/UCUM normalization with terminology mapping and QA checks
10. Push-button certification runner with simulators and PASS/FAIL evidence

## Definition of Done

- [ ] Edge gateway buffers survive network drop and drain on reconnect
- [ ] Device registry enforces ABAC for cross-facility assignment
- [ ] HL7 v2 fixture messages parse, map, store, and ACK correctly
- [ ] ASTM frame parser handles sample analyzer transcripts
- [ ] SDC metrics translate to internal observations (optional path)
- [ ] Alarms route by severity, ack works, audit written
- [ ] Infusion intent passes right-6 checks with step-up auth
- [ ] DICOM study ingests, MWL/MPPS baseline works, viewer loads study
- [ ] LOINC/UCUM normalization covers vitals and common labs
- [ ] `verify-wave21-devices.ps1` runs full suite with PASS/FAIL evidence
