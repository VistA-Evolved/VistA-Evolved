# Device & Modality Coverage Map

> Wave 21 — Device + Modality Integration Platform
> Last updated: Phase 378 (W21-P1)

## Device Categories

### ICU / Patient Monitors

| Category         | Examples                                      | Protocol(s)                | Support Tier   | Phase  |
| ---------------- | --------------------------------------------- | -------------------------- | -------------- | ------ |
| Bedside monitors | Philips MX800, GE CARESCAPE, Draeger Infinity | HL7 v2 ORU, IEEE 11073 SDC | Gateway plugin | P4, P6 |
| Telemetry        | Philips ST80i, GE ApexPro                     | HL7 v2 ORU                 | Gateway plugin | P4     |
| Central station  | Philips PIIC iX, GE CIC Pro                   | HL7 v2 ORU, vendor REST    | Gateway plugin | P4     |

### Ventilators

| Category        | Examples                                   | Protocol(s)            | Support Tier            | Phase  |
| --------------- | ------------------------------------------ | ---------------------- | ----------------------- | ------ |
| ICU ventilators | Draeger Evita, Hamilton G5, Maquet Servo-u | IEEE 11073 SDC, HL7 v2 | Gateway plugin          | P4, P6 |
| Transport vents | Hamilton T1, LTV2                          | Serial/vendor          | Needs vendor middleware | P2     |

### Infusion Pumps

| Category           | Examples                                            | Protocol(s)         | Support Tier   | Phase  |
| ------------------ | --------------------------------------------------- | ------------------- | -------------- | ------ |
| Large volume pumps | BD Alaris, Baxter Spectrum IQ, ICU Medical Plum 360 | HL7 v2, IHE PCD-PIV | Gateway plugin | P4, P8 |
| Syringe pumps      | B. Braun Space, Fresenius Agilia                    | HL7 v2, vendor REST | Gateway plugin | P4, P8 |
| PCA pumps          | BD LifeCare PCA, Smiths CADD-Solis                  | HL7 v2              | Gateway plugin | P4, P8 |

### Anesthesia

| Category            | Examples                      | Protocol(s)            | Support Tier            | Phase  |
| ------------------- | ----------------------------- | ---------------------- | ----------------------- | ------ |
| Anesthesia machines | Draeger Perseus, GE Aisys CS2 | IEEE 11073 SDC, HL7 v2 | Gateway plugin          | P4, P6 |
| Gas monitors        | Masimo SedLine, BIS           | HL7 v2, serial         | Needs vendor middleware | P2     |

### Dialysis

| Category     | Examples                     | Protocol(s)         | Support Tier            | Phase |
| ------------ | ---------------------------- | ------------------- | ----------------------- | ----- |
| Hemodialysis | Fresenius 5008, Baxter AK 98 | HL7 v2, vendor REST | Needs vendor middleware | P2    |

## Lab Analyzers

| Category     | Examples                                        | Protocol(s)     | Support Tier   | Phase  |
| ------------ | ----------------------------------------------- | --------------- | -------------- | ------ |
| Chemistry    | Roche cobas, Abbott Alinity c, Siemens Atellica | HL7 v2, ASTM    | Supported now  | P4, P5 |
| Hematology   | Sysmex XN, Beckman DxH, Abbott Alinity h        | HL7 v2, ASTM    | Supported now  | P4, P5 |
| Immunoassay  | Roche cobas e, Siemens ADVIA Centaur            | HL7 v2, ASTM    | Supported now  | P4, P5 |
| Coagulation  | Stago STA-R Max, IL ACL TOP                     | HL7 v2, ASTM    | Supported now  | P4, P5 |
| Blood gas    | Radiometer ABL900, Siemens RAPIDPoint           | HL7 v2, POCT1-A | Supported now  | P4, P5 |
| Urinalysis   | Iris iQ200, Roche cobas u                       | HL7 v2, ASTM    | Gateway plugin | P4, P5 |
| Microbiology | bioMerieux VITEK, BD BACTEC                     | HL7 v2          | Supported now  | P4     |

## POCT Devices

| Category           | Examples                                       | Protocol(s)          | Support Tier            | Phase |
| ------------------ | ---------------------------------------------- | -------------------- | ----------------------- | ----- |
| Glucometers        | Roche Accu-Chek Inform II, Nova StatStrip      | POCT1-A, HL7 v2.5    | Supported now           | P5    |
| i-STAT             | Abbott i-STAT Alinity                          | POCT1-A              | Supported now           | P5    |
| Coag POCT          | Roche CoaguChek                                | POCT1-A              | Gateway plugin          | P5    |
| Pregnancy/Drugs    | Various strip readers                          | POCT1-A, vendor REST | Needs vendor middleware | P5    |
| POCT Data Managers | Roche cobas infinity POC, Siemens POCcelerator | HL7 v2.5, POCT1-A    | Supported now           | P5    |

## Imaging Modalities

| Category      | Examples                                       | Protocol(s)                | Support Tier            | Phase  |
| ------------- | ---------------------------------------------- | -------------------------- | ----------------------- | ------ |
| CT            | GE Revolution, Siemens SOMATOM, Canon Aquilion | DICOM (C-STORE, MWL, MPPS) | Supported now           | P9     |
| MR            | Siemens MAGNETOM, GE SIGNA, Philips Ingenia    | DICOM (C-STORE, MWL, MPPS) | Supported now           | P9     |
| Ultrasound    | GE LOGIQ, Philips EPIQ, Canon Aplio            | DICOM (C-STORE, MWL)       | Supported now           | P9     |
| X-Ray / DR    | Carestream DRX, Fujifilm FDR, Siemens Ysio     | DICOM (C-STORE, MWL)       | Supported now           | P9     |
| C-Arm         | Siemens Cios, GE OEC, Philips Zenition         | DICOM (C-STORE)            | Gateway plugin          | P9     |
| Mammography   | Hologic Selenia, GE Senographe Pristina        | DICOM (C-STORE, MWL)       | Supported now           | P9     |
| Nuclear Med   | Siemens Symbia, GE Discovery                   | DICOM (C-STORE, MWL)       | Gateway plugin          | P9     |
| Pathology WSI | Hamamatsu NanoZoomer, Leica Aperio             | DICOM WSI, vendor REST     | Needs vendor middleware | Future |

## Protocol Summary

| Protocol         | Standard             | Transport                    | Phases | Gateway Required    |
| ---------------- | -------------------- | ---------------------------- | ------ | ------------------- |
| HL7 v2.x         | HL7 v2.3-2.8         | MLLP (TCP)                   | P4     | No (direct ingest)  |
| ASTM E1381/E1394 | ASTM / CLSI LIS02    | TCP, Serial RS-232           | P5     | Optional            |
| POCT1-A          | IHE PCD POCT1-A      | TCP (via DM)                 | P5     | Via POCT DM         |
| DICOM            | DICOM 3.0            | TCP (DIMSE), HTTP (DICOMweb) | P9     | No (direct Orthanc) |
| IEEE 11073 SDC   | ISO/IEEE 11073-20701 | SOAP/WS-Discovery            | P6     | SDC microservice    |
| IHE PCD-PIV      | IHE PCD TF-2         | HL7 v2                       | P8     | Via pump DM         |
| Vendor REST      | Proprietary          | HTTPS                        | P2     | Gateway adapter     |

## Support Tiers

- **Supported now**: Protocol adapter ships in Wave 21. Works with standard device config.
- **Gateway plugin**: Requires edge gateway (P2) with device-specific adapter plugin.
- **Needs vendor middleware**: Device manager or middleware (e.g., Capsule, Cerner CareAware)
  sits between device and our system. We ingest from the middleware via HL7/REST.
- **Future**: Not in Wave 21 scope. Tracked for roadmap.
