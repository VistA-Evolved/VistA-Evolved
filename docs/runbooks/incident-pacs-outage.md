# Incident Runbook: PACS / Imaging Outage

## Severity: SEV-2 (imaging unavailable; clinical workflow continues without images)

## Symptoms

- OHIF viewer fails to load studies
- DICOMweb queries return errors or empty results
- DICOM C-STORE/C-ECHO to Orthanc times out
- Ingest callback from Orthanc stops arriving
- `/imaging/health` returns errors

## Triage (first 5 minutes)

### 1. Check Orthanc container

```bash
docker ps --filter "name=orthanc"
docker logs --tail 50 orthanc 2>&1
```

### 2. Check OHIF viewer container

```bash
docker ps --filter "name=ohif"
curl -s http://localhost:3003/  # Should return OHIF HTML
```

### 3. Check Orthanc HTTP API

```bash
curl -s http://localhost:8042/system | python -m json.tool
curl -s http://localhost:8042/patients | python -m json.tool
```

### 4. Check DICOM port

```bash
# DICOM C-ECHO on port 4242
Test-NetConnection -ComputerName localhost -Port 4242
```

## Common Causes & Fixes

### Orthanc container stopped

- **Fix**: Restart
  ```bash
  docker compose -f services/imaging/docker-compose.yml up -d
  ```

### Orthanc disk full (studies consume space)

- **Symptom**: New studies rejected, existing studies accessible
- **Fix**:
  ```bash
  # Check Orthanc storage
  docker exec orthanc du -sh /var/lib/orthanc/db
  # Delete old/test studies via REST API
  curl -X DELETE http://localhost:8042/patients/{id}
  ```

### OHIF can't reach DICOMweb proxy

- **Symptom**: OHIF loads but shows no studies
- **Check**: Verify DICOMweb proxy is routing correctly
  ```bash
  curl -s -b cookies.txt "http://localhost:3001/imaging/dicomweb/studies" | head -c 200
  ```
- **Fix**: Check CORS and proxy configuration in API

### OnStableStudy webhook not firing

- **Symptom**: Studies arrive in Orthanc but no ingest callback to API
- **Check**: Lua script loaded
  ```bash
  docker exec orthanc cat /etc/orthanc/on-stable-study.lua
  ```
- **Fix**: Restart Orthanc to reload Lua scripts
- **Check callback URL**:
  ```bash
  docker exec orthanc env | grep INGEST
  # INGEST_CALLBACK_URL should point to API host
  ```

### StableAge too short (partial studies ingested)

- **Symptom**: Incomplete studies appearing in worklist
- **Fix**: Increase `StableAge` in `orthanc.json`
  ```json
  "StableAge": 120
  ```
  Then restart Orthanc.

### Imaging rate limiter triggered

- **Symptom**: 429 responses from DICOMweb proxy
- **Fix**: Increase limits
  ```bash
  DICOMWEB_RATE_LIMIT=300
  DICOMWEB_RATE_WINDOW_MS=60000
  ```

### Break-glass expired

- **Symptom**: 403 from DICOMweb despite authenticated session
- **Fix**: Start a new break-glass session if emergency access needed
  ```bash
  curl -s -b cookies.txt -X POST -H "Content-Type: application/json" \
    -d '{"reason":"emergency","patientDfn":"3","ttlMinutes":30}' \
    http://localhost:3001/security/break-glass/start
  ```

## Degraded Mode Behavior

When PACS is down:

- Clinical data (vitals, allergies, labs, notes) continue working via VistA
- Imaging worklist shows existing orders but can't link new studies
- OHIF viewer unavailable
- Ingest queue builds up (callback failures retry)
- No impact on auth, scheduling, RCM, or messaging

## Recovery Verification

```bash
# Orthanc system info
curl -s http://localhost:8042/system | python -m json.tool

# OHIF loads
curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/

# DICOMweb proxy works
curl -s -b cookies.txt "http://localhost:3001/imaging/health"

# Ingest callback responds
curl -s -X POST -H "X-Service-Key: dev-imaging-ingest-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{"studyInstanceUid":"test","orthancId":"test"}' \
  http://localhost:3001/imaging/ingest/callback
```

## Post-Incident

- Check imaging audit trail: `GET /imaging/audit?limit=50`
- Verify unmatched studies: `GET /imaging/ingest/unmatched`
- Review Orthanc logs for recurring errors
- Document root cause in BUG-TRACKER.md
