# Third-Party Notices — VistA-Evolved

This file documents third-party software referenced or studied during
the development of VistA-Evolved, along with their license terms.

---

## 1. HealtheMe

- **Source**: `reference/HealtheMe-master/`
- **License**: Apache License, Version 2.0
- **Copyright**: Copyright 2012 KRM Associates, Inc.
- **Usage**: Architecture patterns and VistA integration approaches were
  studied for the patient portal design (Phase 26). No code was directly
  copied. The SOAP-to-CCR/CCD integration pattern and PHR data model
  informed the VistA-first portal contract.
- **License URL**: https://www.apache.org/licenses/LICENSE-2.0

## 2. Ottehr

- **Source**: `reference/ottehr ehr main/`
- **License**: MIT License with attribution clause
- **Copyright**: Copyright 2024 MassLight, Inc.
- **Attribution**: Ottehr is built on the Oystehr platform. If Ottehr UI
  components are used, the Oystehr/Ottehr name must be retained in the
  user interface per the license terms.
- **Usage**: Intake flow UX patterns, waiting room design, and FHIR RBAC
  model were studied for the patient portal and telehealth modules.
  No code was directly copied.
- **License URL**: See `reference/ottehr ehr main/LICENSE`

## 3. AIOTP (All In One Telehealth Platform)

- **Source**: `reference/All In One Telehealth Platform -AIOTP-/`
- **License**: Creative Commons Attribution-NonCommercial-ShareAlike 4.0
  International (CC BY-NC-SA 4.0)
- **Copyright**: Commissioned by PAHO/WHO
- **RESTRICTION**: This license prohibits commercial use. **No code from
  AIOTP has been or may be copied into VistA-Evolved.** Only high-level
  architectural observations (Jitsi telehealth pattern, modular deployment
  model) were noted for reference.
- **License URL**: https://creativecommons.org/licenses/by-nc-sa/4.0/

---

## License Compliance Policy

1. **HealtheMe** (Apache 2.0): Patterns may be referenced. Include this
   notice file.
2. **Ottehr** (MIT + attribution): Patterns may be referenced. Retain
   attribution if UI components are used.
3. **AIOTP** (CC BY-NC-SA 4.0): **Observe only. DO NOT copy code.**

The `scripts/license-guard.ps1` script enforces these rules by scanning
the source tree for violations.
