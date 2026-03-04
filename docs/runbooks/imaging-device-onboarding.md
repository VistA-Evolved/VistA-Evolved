# DICOM Device Onboarding — Phase 23 Runbook

## Overview

This runbook covers how to connect a new DICOM modality (CT, MR, US, etc.)
to VistA-Evolved's imaging infrastructure. The process follows IHE Scheduled
Workflow patterns: AE Title configuration → C-ECHO verification → C-STORE test.

## Prerequisites

- Orthanc running: `docker compose --profile imaging up -d` from `services/imaging/`
- Device conformance statement (from manufacturer)
- Network connectivity between modality and Orthanc host

## Step 1: Review Conformance Statement

Every DICOM device comes with a Conformance Statement (CS) document. Check:

- Supported SOP Classes (which DICOM services it implements)
- Supported Transfer Syntaxes
- AE Title requirements
- Port requirements
- Does it support: C-STORE SCP/SCU? Worklist C-FIND SCU? MPPS? Storage Commitment?

## Step 2: Configure Orthanc AE Title

### Current Orthanc Configuration

| Setting          | Value                          |
| ---------------- | ------------------------------ |
| AE Title         | `VISTAEVOLVED`                 |
| DICOM Port       | 4242                           |
| CheckCalledAet   | false (accepts any called AET) |
| AlwaysAllowStore | true (any device can C-STORE)  |
| AlwaysAllowEcho  | true (any device can C-ECHO)   |

### For production: Register known modalities

Edit `services/imaging/orthanc.json` to add known peers:

```json
{
  "DicomModalities": {
    "CT_SCANNER_1": ["CT_SCANNER_1", "192.168.1.100", 104],
    "MR_SIEMENS": ["MR_SIEMENS", "192.168.1.101", 104]
  }
}
```

Use the AE title template at `services/imaging/ae-title-template.json` for documentation.

## Step 3: C-ECHO Verification

### From Orthanc to Modality

```bash
# Via Orthanc REST API
curl -X POST http://localhost:8042/modalities/CT_SCANNER_1/echo
```

### From Modality to Orthanc

Configure the modality to echo:

- Remote AE Title: `VISTAEVOLVED`
- Remote Host: `<orthanc-host-ip>`
- Remote Port: `4242`

### Using dcm4che tools (optional)

```bash
# Install dcm4che toolkit
# C-ECHO from your workstation to Orthanc
storescu -c VISTAEVOLVED@localhost:4242 --echo
```

## Step 4: C-STORE Test

### Send a test DICOM file to Orthanc

```bash
# Using storescu (part of dcm4che or dcmtk)
storescu -c VISTAEVOLVED@localhost:4242 /path/to/test.dcm

# Or use the Orthanc REST API to upload
curl -X POST http://localhost:8042/instances -H "Content-Type: application/dicom" --data-binary @test.dcm
```

### Verify reception

```bash
# Check Orthanc for the study
curl http://localhost:8042/studies | python -m json.tool

# Check via API proxy
curl -b cookies.txt http://localhost:3001/imaging/dicom-web/studies
```

## Step 5: Configure Routing Rules

### Auto-forwarding (to long-term archive)

If you have a VNA or PACS for long-term storage, configure routing in `orthanc.json`:

```json
{
  "OrthancPeers": {
    "ARCHIVE": {
      "Url": "http://archive-orthanc:8042"
    }
  }
}
```

Then add auto-routing in the Lua script:

```lua
function OnStoredInstance(instanceId, tags, metadata, origin)
  -- Forward to long-term archive
  SendToPeer(instanceId, "ARCHIVE")
end
```

## Step 6: Verify Ingest Workflow

### Create an imaging order

```bash
curl -b cookies.txt -X POST http://localhost:3001/imaging/worklist/orders \
  -H "Content-Type: application/json" \
  -d '{
    "patientDfn": "100022",
    "scheduledProcedure": "CT Chest",
    "modality": "CT",
    "priority": "routine"
  }'
# Note the accessionNumber in the response
```

### Send study with matching AccessionNumber

Set the AccessionNumber in the DICOM header to match the order's accession number.
After Orthanc's StableAge (60s), the OnStableStudy callback will fire and reconcile.

### Check linkage

```bash
curl -b cookies.txt http://localhost:3001/imaging/ingest/linkages/by-patient/100022
```

## Troubleshooting

| Problem                      | Fix                                                              |
| ---------------------------- | ---------------------------------------------------------------- |
| C-ECHO fails                 | Check firewall, verify AET and port, check `DicomCheckCalledAet` |
| C-STORE rejected             | Verify Transfer Syntax support. Check Orthanc logs               |
| Study not appearing          | Wait for StableAge (60s). Check Orthanc REST `/changes`          |
| Callback not firing          | Check Lua script loaded. Check Orthanc logs for `[INGEST]`       |
| AccessionNumber not matching | Verify exact string match. Check DICOM tag `(0008,0050)`         |
| Wrong PatientID              | Ensure modality uses same ID scheme as VistA DFN                 |

## Security Checklist

- [ ] Change `IMAGING_INGEST_WEBHOOK_SECRET` from default value
- [ ] Set `DicomCheckCalledAet: true` in production Orthanc config
- [ ] Restrict `DicomAlwaysAllowStore: false` and use explicit modality list
- [ ] Enable TLS on DICOM connections (if supported by modality)
- [ ] Review conformance statement for any non-standard behaviors
- [ ] Document AE title in `services/imaging/ae-title-template.json`
