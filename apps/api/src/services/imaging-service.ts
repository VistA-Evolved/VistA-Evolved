/**
 * Imaging Integration Service — Phase 18C.
 *
 * Enhances Phase 14D imaging routes with enterprise capabilities:
 *   - Patient image list from VistA Imaging (MAG4)
 *   - Radiology report text from RA DETAILED REPORT
 *   - DICOMweb integration for external PACS/VNA (Orthanc, dcm4chee)
 *   - OHIF viewer URL generation
 *   - Image metadata retrieval
 *   - Integration registry-aware: uses configured imaging entries
 *
 * VistA-first: all imaging queries start with VistA RPCs.
 * Falls back to external DICOMweb endpoints if configured.
 *
 * Routes:
 *   GET /vista/imaging/status           — overall imaging status (Phase 14D, enhanced)
 *   GET /vista/imaging/report           — radiology report text (Phase 14D)
 *   GET /vista/imaging/studies          — patient study list
 *   GET /vista/imaging/viewer-url       — generate viewer URL for a study
 *   GET /vista/imaging/metadata         — image metadata for a study
 *   GET /vista/imaging/registry-status  — status from integration registry
 */

import type { FastifyInstance } from "fastify";
import { validateCredentials } from "../vista/config.js";
import { connect, disconnect, callRpc } from "../vista/rpcBrokerClient.js";
import { optionalRpc } from "../vista/rpcCapabilities.js";
import {
  listIntegrations,
  getIntegrationHealthSummary,
  type IntegrationEntry,
} from "../config/integration-registry.js";
import { audit } from "../lib/audit.js";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ImagingStudy {
  studyId: string;
  studyDate: string;
  modality: string;
  description: string;
  imageCount: number;
  status: string;
  source: "vista" | "dicomweb" | "pacs";
  /** Study Instance UID for DICOMweb */
  studyInstanceUid?: string;
}

export interface ViewerUrlResult {
  url: string;
  viewerType: "ohif" | "vista-imaging" | "basic" | "none";
  message: string;
}

/* ------------------------------------------------------------------ */
/* Plugin interface (carried over from Phase 14D)                       */
/* ------------------------------------------------------------------ */

export interface ImagingViewerPlugin {
  name: string;
  version: string;
  supportsImageDisplay: boolean;
  initialize(): Promise<void>;
  getImages(dfn: string, caseId?: string): Promise<{ url: string; description: string }[]>;
}

const plugins: ImagingViewerPlugin[] = [];

export function registerImagingPlugin(plugin: ImagingViewerPlugin): void {
  plugins.push(plugin);
  log.info(`Registered imaging plugin: ${plugin.name} v${plugin.version}`);
}

/* ------------------------------------------------------------------ */
/* Helper: find imaging-type integrations for a tenant                  */
/* ------------------------------------------------------------------ */

function getImagingIntegrations(tenantId: string): IntegrationEntry[] {
  return listIntegrations(tenantId).filter(
    (e) =>
      e.enabled &&
      (e.type === "pacs-vna" || e.type === "dicom" || e.type === "dicomweb"),
  );
}

/** Build an OHIF viewer URL for a study UID. */
function buildOhifViewerUrl(pacsEntry: IntegrationEntry, studyInstanceUid: string): string {
  if (pacsEntry.config.kind === "pacs-vna" && pacsEntry.config.viewerUrlTemplate) {
    return pacsEntry.config.viewerUrlTemplate.replace("{studyUID}", studyInstanceUid);
  }
  // Default OHIF URL pattern
  const protocol = pacsEntry.port === 443 ? "https" : "http";
  return `${protocol}://${pacsEntry.host}:${pacsEntry.port}/viewer?StudyInstanceUIDs=${studyInstanceUid}`;
}

/* ------------------------------------------------------------------ */
/* Helper: extract audit actor from request                             */
/* ------------------------------------------------------------------ */

function auditActor(request: any): { duz: string; name?: string; role?: string } {
  const s = request.session;
  if (s) return { duz: s.duz, name: s.userName, role: s.role };
  return { duz: "system" };
}

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

export default async function imagingRoutes(server: FastifyInstance): Promise<void> {

  /**
   * GET /vista/imaging/status
   *
   * Overall imaging status: VistA MAG4, RA, plugins, registry entries.
   * (Enhanced version of Phase 14D.)
   */
  server.get("/vista/imaging/status", async (request) => {
    const mag4Check = optionalRpc("MAG4 REMOTE PROCEDURE");
    const raCheck = optionalRpc("RA DETAILED REPORT");

    // Check integration registry for imaging systems
    const tenantId = (request as any).session?.tenantId || "default";
    const imagingEntries = getImagingIntegrations(tenantId);

    return {
      ok: true,
      viewerEnabled:
        mag4Check.available || raCheck.available || plugins.length > 0 || imagingEntries.length > 0,
      capabilities: {
        vistaImaging: {
          available: mag4Check.available,
          rpc: "MAG4 REMOTE PROCEDURE",
          status: mag4Check.available ? "active" : "not-available-on-distro",
        },
        radiology: {
          available: raCheck.available,
          rpc: "RA DETAILED REPORT",
          status: raCheck.available ? "active" : "not-available-on-distro",
        },
        plugins: plugins.map((p) => ({
          name: p.name,
          version: p.version,
          supportsImageDisplay: p.supportsImageDisplay,
        })),
        registryEntries: imagingEntries.map((e) => ({
          id: e.id,
          label: e.label,
          type: e.type,
          status: e.status,
          enabled: e.enabled,
        })),
      },
      integrationReady: true,
      message:
        mag4Check.available || raCheck.available
          ? "Imaging APIs detected. Viewer integration active."
          : imagingEntries.length > 0
            ? `${imagingEntries.length} external imaging system(s) configured.`
            : "Imaging APIs not available on this distro. Plugin interface ready.",
    };
  });

  /**
   * GET /vista/imaging/report?dfn=1&caseId=123
   *
   * Radiology report text (carried from Phase 14D).
   */
  server.get("/vista/imaging/report", async (request, reply) => {
    const { dfn, caseId } = request.query as any;
    if (!dfn) {
      return reply.code(400).send({ ok: false, error: "Missing dfn" });
    }

    const raCheck = optionalRpc("RA DETAILED REPORT");
    if (!raCheck.available) {
      return {
        ok: true,
        available: false,
        message:
          "RA DETAILED REPORT not available on this distro. Radiology reports require VistA Imaging integration.",
      };
    }

    try {
      validateCredentials();
      await connect();
      const resp = await callRpc("RA DETAILED REPORT", [String(dfn), String(caseId || "")]);
      disconnect();

      audit("phi.imaging-view", "success", auditActor(request), {
        patientDfn: String(dfn),
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { caseId, rpc: "RA DETAILED REPORT" },
      });

      return { ok: true, available: true, text: resp.join("\n"), rpcUsed: "RA DETAILED REPORT" };
    } catch (err: any) {
      disconnect();
      return { ok: false, error: err.message };
    }
  });

  /**
   * GET /vista/imaging/studies?dfn=1
   *
   * Get patient imaging studies. Tries VistA RPCs first,
   * then falls back to DICOMweb (QIDO-RS) if configured.
   */
  server.get("/vista/imaging/studies", async (request, reply) => {
    const { dfn } = request.query as any;
    if (!dfn) {
      return reply.code(400).send({ ok: false, error: "Missing dfn" });
    }

    const studies: ImagingStudy[] = [];
    const tenantId = (request as any).session?.tenantId || "default";

    // 1. Try VistA MAG4 REMOTE PROCEDURE (if available)
    const mag4Check = optionalRpc("MAG4 REMOTE PROCEDURE");
    if (mag4Check.available) {
      try {
        validateCredentials();
        await connect();
        const resp = await callRpc("MAG4 REMOTE PROCEDURE", [
          "IMAGELIST",
          String(dfn),
          "",
        ]);
        disconnect();

        // Parse MAG4 response (each line is a study record)
        for (const line of resp) {
          if (!line || line.startsWith("0^")) continue;
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
        log.warn("MAG4 study list failed", { error: err.message, dfn });
        disconnect();
      }
    }

    // 2. Try DICOMweb (QIDO-RS) from registered integrations
    const dicomwebEntries = getImagingIntegrations(tenantId).filter(
      (e) => e.type === "dicomweb" && e.status === "connected",
    );
    for (const entry of dicomwebEntries) {
      try {
        const protocol = entry.port === 443 ? "https" : "http";
        const qidoPath =
          entry.config.kind === "dicomweb" ? entry.config.qidoRsPath : "/rs/studies";
        const url = `${protocol}://${entry.host}:${entry.port}${qidoPath}?PatientID=${dfn}&limit=50`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const resp = await fetch(url, {
          headers: { Accept: "application/dicom+json" },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (resp.ok) {
          const data = (await resp.json()) as any[];
          for (const study of data) {
            studies.push({
              studyId: study["0020000D"]?.Value?.[0] || "", // StudyInstanceUID
              studyDate: study["00080020"]?.Value?.[0] || "",
              modality: study["00080060"]?.Value?.[0] || "",
              description: study["00081030"]?.Value?.[0] || "",
              imageCount: study["00201208"]?.Value?.[0] || 0,
              status: "available",
              source: "dicomweb",
              studyInstanceUid: study["0020000D"]?.Value?.[0] || "",
            });
          }
        }
      } catch (err: any) {
        log.warn("DICOMweb QIDO-RS query failed", {
          integrationId: entry.id,
          error: err.message,
        });
      }
    }

    audit("phi.imaging-view", "success", auditActor(request), {
      patientDfn: String(dfn),
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { studyCount: studies.length },
    });

    return {
      ok: true,
      dfn,
      studies,
      count: studies.length,
      sources: {
        vistaImaging: mag4Check.available,
        dicomwebEndpoints: dicomwebEntries.length,
      },
    };
  });

  /**
   * GET /vista/imaging/viewer-url?studyUid=X&tenantId=default
   *
   * Generate a viewer URL for a specific study.
   * Checks for OHIF-compatible PACS/VNA in the integration registry.
   */
  server.get("/vista/imaging/viewer-url", async (request, reply) => {
    const { studyUid } = request.query as any;
    if (!studyUid) {
      return reply.code(400).send({ ok: false, error: "Missing studyUid" });
    }

    const tenantId = (request as any).session?.tenantId || "default";
    const pacsEntries = getImagingIntegrations(tenantId).filter(
      (e) => (e.type === "pacs-vna" || e.type === "dicomweb") && e.enabled,
    );

    if (pacsEntries.length === 0) {
      return {
        ok: true,
        viewer: {
          url: "",
          viewerType: "none",
          message: "No PACS/VNA or DICOMweb viewer configured. Add one via Admin > Integration Registry.",
        } as ViewerUrlResult,
      };
    }

    // Use the first available PACS that has a viewer template
    const pacs = pacsEntries[0];
    const url = buildOhifViewerUrl(pacs, studyUid);

    audit("imaging.viewer-launch" as any, "success", auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { studyUid, viewerUrl: url, integrationId: pacs.id },
    });

    return {
      ok: true,
      viewer: {
        url,
        viewerType: pacs.config.kind === "pacs-vna" ? "ohif" : "basic",
        message: `Viewer URL generated via ${pacs.label}`,
      } as ViewerUrlResult,
    };
  });

  /**
   * GET /vista/imaging/metadata?studyUid=X
   *
   * Return study-level metadata from DICOMweb (WADO-RS metadata).
   */
  server.get("/vista/imaging/metadata", async (request, reply) => {
    const { studyUid } = request.query as any;
    if (!studyUid) {
      return reply.code(400).send({ ok: false, error: "Missing studyUid" });
    }

    const tenantId = (request as any).session?.tenantId || "default";
    const dicomwebEntries = getImagingIntegrations(tenantId).filter(
      (e) => e.type === "dicomweb" && e.enabled,
    );

    if (dicomwebEntries.length === 0) {
      return {
        ok: true,
        available: false,
        message: "No DICOMweb endpoints configured for metadata retrieval.",
      };
    }

    const entry = dicomwebEntries[0];
    try {
      const protocol = entry.port === 443 ? "https" : "http";
      const wadoPath =
        entry.config.kind === "dicomweb" ? entry.config.wadoRsPath : "/rs/studies";
      const url = `${protocol}://${entry.host}:${entry.port}${wadoPath}/${studyUid}/metadata`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(url, {
        headers: { Accept: "application/dicom+json" },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        return { ok: false, error: `DICOMweb metadata request returned ${resp.status}` };
      }
      const metadata = await resp.json();
      return { ok: true, available: true, studyUid, metadata };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  /**
   * GET /vista/imaging/registry-status
   *
   * Return the imaging-specific slice of the integration registry health.
   */
  server.get("/vista/imaging/registry-status", async (request) => {
    const tenantId = (request as any).session?.tenantId || "default";
    const entries = getImagingIntegrations(tenantId);

    return {
      ok: true,
      tenantId,
      imagingIntegrations: entries.map((e) => ({
        id: e.id,
        label: e.label,
        type: e.type,
        status: e.status,
        enabled: e.enabled,
        lastChecked: e.lastChecked,
        errorCount: e.errorLog.length,
        queuePending: e.queueMetrics.pending,
      })),
      count: entries.length,
    };
  });
}
