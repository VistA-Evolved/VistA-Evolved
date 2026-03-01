/**
 * Imaging Viewer Routes -- Phase 81.
 *
 * Clean Phase 81 route file providing 3 patient-facing imaging endpoints:
 *   GET /imaging/studies/:dfn       -- Patient study list (VistA MAG4 -> Orthanc -> pendingTargets)
 *   GET /imaging/report/:studyId    -- Radiology report text (RA DETAILED REPORT -> TIU fallback)
 *   GET /imaging/viewer-link/:studyId -- DICOM viewer URL or integration instructions
 *
 * VistA-first: all queries attempt VistA RPCs before falling back to
 * Orthanc DICOMweb or returning honest pendingTargets.
 *
 * Pixel data retrieval is via Orthanc (DICOM server) -- we do NOT
 * invent a parallel imaging store.
 *
 * See: docs/runbooks/phase81-imaging-viewer.md
 */

import type { FastifyInstance } from "fastify";
import { validateCredentials } from "../vista/config.js";
import { optionalRpc } from "../vista/rpcCapabilities.js";
import { safeCallRpc } from "../lib/rpc-resilience.js";
import { IMAGING_CONFIG } from "../config/server-config.js";
import { audit } from "../lib/audit.js";
import { log } from "../lib/logger.js";
import { getLinkagesForPatient, getLinkageByStudyUid } from "../services/imaging-ingest.js";
import { findByPatientDfn as findOrdersByPatient } from "../services/imaging-worklist.js";
import { getViewerUrl as getTenantViewerUrl, getOrthancUrl as getTenantOrthancUrl } from "../config/imaging-tenant.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ImagingStudyResult {
  studyId: string;
  studyDate: string;
  modality: string;
  description: string;
  imageCount: number;
  status: string;
  source: "vista" | "orthanc" | "dicomweb" | "pacs";
  studyInstanceUid?: string;
  linkedOrderId?: string;
  accessionNumber?: string;
  orderLinked?: boolean;
}

export interface ReportResult {
  ok: boolean;
  available: boolean;
  reportText?: string;
  reportStatus?: "preliminary" | "final" | "addendum" | "unknown";
  rpcUsed?: string;
  pendingTarget?: {
    rpc: string;
    vistaFile: string;
    reason: string;
    migrationPath: string;
  };
}

export interface ViewerLinkResult {
  ok: boolean;
  viewerAvailable: boolean;
  url?: string;
  viewerType?: "ohif" | "basic" | "none";
  message: string;
  instructions?: string[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function auditActor(request: any): { duz: string; name?: string; role?: string } {
  const s = request.session;
  if (s) return { duz: s.duz, name: s.userName, role: s.role };
  return { duz: "system" };
}

/** Check if OHIF viewer is reachable (quick probe). */
async function isViewerReachable(viewerUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(viewerUrl, { signal: controller.signal });
    clearTimeout(timeout);
    return resp.ok || resp.status === 304;
  } catch {
    return false;
  }
}

/** Check if Orthanc is reachable. */
async function isOrthancReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`${IMAGING_CONFIG.orthancUrl}/system`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return resp.ok;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Route plugin                                                        */
/* ------------------------------------------------------------------ */

export default async function imagingViewerRoutes(server: FastifyInstance): Promise<void> {

  /**
   * GET /imaging/studies/:dfn
   *
   * Returns patient imaging studies. Tries VistA RPCs first (MAG4 REMOTE
   * PROCEDURE), then falls back to Orthanc QIDO-RS, then returns
   * explicit pendingTargets if nothing is available.
   */
  server.get("/imaging/studies/:dfn", async (request, reply) => {
    const { dfn } = request.params as { dfn: string };
    if (!dfn) {
      return reply.code(400).send({ ok: false, error: "Missing dfn" });
    }

    const studies: ImagingStudyResult[] = [];
    const tenantId = (request as any).session?.tenantId || "default";
    const pendingTargets: { rpc: string; reason: string }[] = [];

    // 1. Try VistA MAG4 REMOTE PROCEDURE
    const mag4Check = optionalRpc("MAG4 REMOTE PROCEDURE");
    if (mag4Check.available) {
      try {
        validateCredentials();
        const resp = await safeCallRpc("MAG4 REMOTE PROCEDURE", ["IMAGELIST", dfn, ""]);

        for (const line of resp) {
          if (line.startsWith("0^")) continue;
          const parts = line.split("^");
          if (parts.length >= 4) {
            studies.push({
              studyId: parts[0] || "",
              studyDate: parts[1] || "",
              modality: parts[2] || "",
              description: parts[3] || "",
              imageCount: parseInt(parts[4] || "0", 10) || 0,
              status: "available",
              source: "vista",
            });
          }
        }
      } catch (err: any) {
        log.warn("MAG4 study list failed", { error: err.message });
      }
    } else {
      pendingTargets.push({
        rpc: "MAG4 REMOTE PROCEDURE",
        reason: "Not available on this VistA distro. Install VistA Imaging package for native study list.",
      });
    }

    // 2. Try Orthanc QIDO-RS
    if (studies.length === 0) {
      try {
        const qidoUrl = `${IMAGING_CONFIG.orthancUrl}${IMAGING_CONFIG.dicomWebRoot}/studies?PatientID=${encodeURIComponent(dfn)}&limit=50&includefield=00081030`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const resp = await fetch(qidoUrl, {
          headers: { Accept: "application/dicom+json" },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (resp.ok) {
          const data = (await resp.json()) as any[];
          for (const study of data) {
            const uid = study["0020000D"]?.Value?.[0] || "";
            studies.push({
              studyId: uid,
              studyDate: study["00080020"]?.Value?.[0] || "",
              modality: (study["00080061"]?.Value || []).join("/") || study["00080060"]?.Value?.[0] || "",
              description: study["00081030"]?.Value?.[0] || "",
              imageCount: study["00201208"]?.Value?.[0] || 0,
              status: "available",
              source: "orthanc",
              studyInstanceUid: uid,
            });
          }
        }
      } catch (err: any) {
        log.debug("Orthanc QIDO-RS unavailable", { error: err.message });
      }
    }

    // 3. Enrich with order linkage (Phase 23)
    const linkages = await getLinkagesForPatient(dfn);
    const orders = await findOrdersByPatient(dfn);
    for (const study of studies) {
      const uid = study.studyInstanceUid || study.studyId;
      const linkage = uid ? await getLinkageByStudyUid(uid) : undefined;
      if (linkage) {
        study.linkedOrderId = linkage.orderId;
        study.accessionNumber = linkage.accessionNumber;
        study.orderLinked = true;
      } else {
        study.orderLinked = false;
      }
    }

    audit("phi.imaging-view", "success", auditActor(request), {
      patientDfn: dfn,
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { studyCount: studies.length, route: "phase81" },
    });

    return {
      ok: true,
      dfn,
      studies,
      count: studies.length,
      sources: {
        vistaImaging: mag4Check.available,
        orthanc: studies.some((s) => s.source === "orthanc"),
      },
      orderSummary: {
        totalOrders: orders.length,
        linkedStudies: linkages.length,
        unmatchedStudies: studies.filter((s) => !s.orderLinked).length,
      },
      pendingTargets: pendingTargets.length > 0 ? pendingTargets : undefined,
      rpcUsed: mag4Check.available ? ["MAG4 REMOTE PROCEDURE"] : [],
    };
  });

  /**
   * GET /imaging/report/:studyId
   *
   * Returns radiology report text for a study. Tries VistA RA DETAILED
   * REPORT first, then TIU GET RECORD TEXT as fallback, then returns
   * a pendingTarget with precise VistA file info.
   */
  server.get("/imaging/report/:studyId", async (request, reply) => {
    const { studyId } = request.params as { studyId: string };
    if (!studyId) {
      return reply.code(400).send({ ok: false, error: "Missing studyId" });
    }

    // 1. Try RA DETAILED REPORT
    const raCheck = optionalRpc("RA DETAILED REPORT");
    if (raCheck.available) {
      try {
        validateCredentials();
        const resp = await safeCallRpc("RA DETAILED REPORT", [studyId, ""]);

        const text = resp.join("\n").trim();
        if (text && text !== "" && !text.startsWith("0^")) {
          audit("phi.imaging-view", "success", auditActor(request), {
            requestId: (request as any).requestId,
            sourceIp: request.ip,
            detail: { studyId, rpc: "RA DETAILED REPORT", type: "report" },
          });

          // Infer report status from text content
          let reportStatus: "preliminary" | "final" | "addendum" | "unknown" = "unknown";
          const textUpper = text.toUpperCase();
          if (textUpper.includes("ADDENDUM")) reportStatus = "addendum";
          else if (textUpper.includes("FINAL") || textUpper.includes("VERIFIED")) reportStatus = "final";
          else if (textUpper.includes("PRELIMINARY") || textUpper.includes("DRAFT")) reportStatus = "preliminary";

          return {
            ok: true,
            available: true,
            studyId,
            reportText: text,
            reportStatus,
            rpcUsed: "RA DETAILED REPORT",
          } satisfies ReportResult & { studyId: string };
        }
      } catch (err: any) {
        log.warn("RA DETAILED REPORT failed", { error: err.message, studyId });
      }
    }

    // 2. Try TIU GET RECORD TEXT as fallback (if studyId is a TIU document IEN)
    const tiuCheck = optionalRpc("TIU GET RECORD TEXT");
    if (tiuCheck.available) {
      try {
        validateCredentials();
        const resp = await safeCallRpc("TIU GET RECORD TEXT", [studyId]);

        const text = resp.join("\n").trim();
        if (text && text !== "" && !text.startsWith("0^")) {
          audit("phi.imaging-view", "success", auditActor(request), {
            requestId: (request as any).requestId,
            sourceIp: request.ip,
            detail: { studyId, rpc: "TIU GET RECORD TEXT", type: "report" },
          });

          return {
            ok: true,
            available: true,
            studyId,
            reportText: text,
            reportStatus: "unknown",
            rpcUsed: "TIU GET RECORD TEXT",
          } satisfies ReportResult & { studyId: string };
        }
      } catch (err: any) {
        log.debug("TIU GET RECORD TEXT fallback failed", { error: err.message, studyId });
      }
    }

    // 3. Return honest pendingTarget
    return {
      ok: true,
      available: false,
      studyId,
      reportText: undefined,
      reportStatus: undefined,
      rpcUsed: undefined,
      pendingTarget: {
        rpc: "RA DETAILED REPORT",
        vistaFile: "#74 RAD/NUC MED REPORTS",
        reason: raCheck.available
          ? "RPC available but no report data found for this study ID"
          : "RA DETAILED REPORT not available on this VistA distro",
        migrationPath: "Install VistA Radiology package. Create radiology cases + reports. RA DETAILED REPORT returns text for case IEN.",
      },
    } satisfies ReportResult & { studyId: string };
  });

  /**
   * GET /imaging/viewer-link/:studyId
   *
   * Returns a DICOM viewer URL for the given study, or integration
   * instructions if no viewer is configured/reachable.
   */
  server.get("/imaging/viewer-link/:studyId", async (request, reply) => {
    const { studyId } = request.params as { studyId: string };
    if (!studyId) {
      return reply.code(400).send({ ok: false, error: "Missing studyId" });
    }

    const tenantId = (request as any).session?.tenantId || "default";

    // 1. Check tenant-scoped viewer config
    let viewerBaseUrl = IMAGING_CONFIG.ohifUrl;
    let orthancUrl = IMAGING_CONFIG.orthancUrl;
    try {
      viewerBaseUrl = getTenantViewerUrl(tenantId);
      orthancUrl = getTenantOrthancUrl(tenantId);
    } catch {
      // Use defaults
    }

    // 2. Probe viewer + Orthanc availability
    const [viewerOk, orthancOk] = await Promise.all([
      isViewerReachable(viewerBaseUrl),
      isOrthancReachable(),
    ]);

    if (viewerOk && orthancOk) {
      const url = `${viewerBaseUrl}/viewer?StudyInstanceUIDs=${studyId}`;

      audit("imaging.viewer-launch", "success", auditActor(request), {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { studyId, viewerUrl: url, viewerType: "ohif" },
      });

      return {
        ok: true,
        viewerAvailable: true,
        studyId,
        url,
        viewerType: "ohif",
        message: "OHIF viewer URL generated. Open in new tab or embedded iframe.",
      } satisfies ViewerLinkResult & { studyId: string };
    }

    if (orthancOk && !viewerOk) {
      // Orthanc is up but no OHIF -- provide DICOMweb URL for manual viewer
      const dicomWebUrl = `${orthancUrl}${IMAGING_CONFIG.dicomWebRoot}/studies/${studyId}`;

      return {
        ok: true,
        viewerAvailable: false,
        studyId,
        url: dicomWebUrl,
        viewerType: "basic",
        message: "OHIF viewer not reachable. DICOMweb URL provided for manual viewer integration.",
        instructions: [
          "OHIF viewer is not currently reachable.",
          `Orthanc DICOMweb endpoint: ${dicomWebUrl}`,
          "To enable OHIF: docker compose up -d ohif (in services/imaging/)",
          `Set OHIF_VIEWER_URL=${viewerBaseUrl} in .env.local`,
          "OHIF will connect to Orthanc DICOMweb automatically.",
        ],
      } satisfies ViewerLinkResult & { studyId: string };
    }

    // Neither available -- full integration instructions
    return {
      ok: true,
      viewerAvailable: false,
      studyId,
      viewerType: "none",
      message: "No DICOM viewer or server available. Follow setup instructions to enable imaging.",
      instructions: [
        "1. Start Orthanc DICOM server: cd services/imaging && docker compose up -d",
        "2. Start OHIF viewer: OHIF runs on port 3003 by default",
        "3. Upload DICOM studies to Orthanc (port 8042 web UI or STOW-RS)",
        "4. Set environment variables in apps/api/.env.local:",
        "   ORTHANC_URL=http://localhost:8042",
        "   OHIF_VIEWER_URL=http://localhost:3003",
        "5. Restart the API server",
        "6. Studies will appear in the imaging panel once Orthanc has data",
        "",
        "For production VistA Imaging integration:",
        "  - Install VistA Imaging package (MAG namespace RPCs)",
        "  - Configure VistA Imaging display gateway",
        "  - See docs/runbooks/phase81-imaging-viewer.md",
      ],
    } satisfies ViewerLinkResult & { studyId: string };
  });
}
