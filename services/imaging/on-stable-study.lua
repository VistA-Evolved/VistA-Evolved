-- on-stable-study.lua -- Orthanc Lua callback for Phase 23 ingest workflow.
--
-- Called by Orthanc when a study becomes "stable" (no new instances
-- for StableAge seconds -- default 60s in orthanc.json).
--
-- Extracts DICOM tags and POSTs them to the API ingest callback.
-- The API handles reconciliation, not this script.
--
-- Configuration:
--   INGEST_CALLBACK_URL   -- API endpoint (default: http://host.docker.internal:3001/imaging/ingest/callback)
--   INGEST_SERVICE_KEY    -- shared secret for X-Service-Key header

-- Configuration -- override via Orthanc env or edit here
local CALLBACK_URL = os.getenv("INGEST_CALLBACK_URL") or "http://host.docker.internal:3001/imaging/ingest/callback"
local SERVICE_KEY  = os.getenv("INGEST_SERVICE_KEY")  or "dev-imaging-ingest-key-change-in-production"

function OnStableStudy(studyId, tags, metadata)
  -- studyId = Orthanc internal ID
  -- tags = table of main DICOM tags
  -- metadata = Orthanc metadata

  local study = RestApiGet("/studies/" .. studyId)
  if study == nil then
    print("[INGEST] ERROR: Could not fetch study " .. studyId)
    return
  end

  local parsed = ParseJson(study)
  if parsed == nil then
    print("[INGEST] ERROR: Could not parse study JSON for " .. studyId)
    return
  end

  local mainTags = parsed["MainDicomTags"] or {}
  local patientTags = parsed["PatientMainDicomTags"] or {}

  -- Count series and instances
  local seriesCount = 0
  local instanceCount = 0
  local seriesList = parsed["Series"] or {}
  seriesCount = #seriesList
  for _, seriesId in ipairs(seriesList) do
    local seriesInfo = RestApiGet("/series/" .. seriesId)
    if seriesInfo then
      local sp = ParseJson(seriesInfo)
      if sp and sp["Instances"] then
        instanceCount = instanceCount + #sp["Instances"]
      end
    end
  end

  -- Build callback payload
  local payload = {
    orthancStudyId = studyId,
    studyInstanceUid = mainTags["StudyInstanceUID"] or "",
    patientId = patientTags["PatientID"] or "",
    patientName = patientTags["PatientName"] or "",
    accessionNumber = mainTags["AccessionNumber"] or "",
    modality = mainTags["ModalitiesInStudy"] or mainTags["Modality"] or "",
    studyDate = mainTags["StudyDate"] or "",
    studyDescription = mainTags["StudyDescription"] or "",
    seriesCount = seriesCount,
    instanceCount = instanceCount
  }

  local body = DumpJson(payload)

  print("[INGEST] Study stable: " .. studyId ..
    " PatientID=" .. payload.patientId ..
    " Accession=" .. payload.accessionNumber ..
    " Modality=" .. payload.modality)

  -- POST to API ingest callback
  local headers = {
    ["Content-Type"] = "application/json",
    ["X-Service-Key"] = SERVICE_KEY
  }

  local response = HttpPost(CALLBACK_URL, body, headers)

  if response then
    print("[INGEST] Callback response: " .. tostring(response))
  else
    print("[INGEST] WARNING: Callback failed for study " .. studyId .. " -- will retry on next stable event")
  end
end
