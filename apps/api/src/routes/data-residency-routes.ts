/**
 * Data Residency Routes — Phase 311
 *
 * Admin-only endpoints for managing data regions and transfer agreements.
 */

import type { FastifyInstance } from "fastify";
import {
  DATA_REGIONS,
  REGION_CATALOG,
  isValidDataRegion,
  getRegionMetadata,
  resolveRegionPgUrl,
  resolveRegionAuditBucket,
  validateCrossBorderTransfer,
  type DataTransferAgreement,
  type DataRegion,
} from "../platform/data-residency.js";
import { randomBytes } from "node:crypto";

// ── In-Memory Stores (Phase 311 scaffold) ──────────────────────

const transferAgreements = new Map<string, DataTransferAgreement>();
const tenantRegions = new Map<string, DataRegion>();

// ── Route Registration ─────────────────────────────────────────

export async function dataResidencyRoutes(app: FastifyInstance): Promise<void> {
  // GET /residency/regions — list all data regions
  app.get("/residency/regions", async (_request, _reply) => {
    return {
      ok: true,
      regions: REGION_CATALOG.map((r) => ({
        ...r,
        pgUrlConfigured: !!safeResolvePg(r.region),
        auditBucket: resolveRegionAuditBucket(r.region),
      })),
    };
  });

  // GET /residency/regions/:region — get region details
  app.get("/residency/regions/:region", async (request, reply) => {
    const { region } = request.params as { region: string };
    if (!isValidDataRegion(region)) {
      return reply.code(404).send({ ok: false, error: "Unknown region" });
    }
    const meta = getRegionMetadata(region);
    return {
      ok: true,
      region: meta,
      pgUrlConfigured: !!safeResolvePg(region),
      auditBucket: resolveRegionAuditBucket(region),
    };
  });

  // GET /residency/tenant/:tenantId — get tenant's region assignment
  app.get("/residency/tenant/:tenantId", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const region = tenantRegions.get(tenantId);
    if (!region) {
      return reply.code(404).send({ ok: false, error: "Tenant has no region assignment" });
    }
    return {
      ok: true,
      tenantId,
      dataRegion: region,
      regionMeta: getRegionMetadata(region),
      immutable: true,
    };
  });

  // POST /residency/tenant/:tenantId/assign — assign region (one-time only)
  app.post("/residency/tenant/:tenantId/assign", async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const body = (request.body as Record<string, unknown>) || {};
    const region = body.dataRegion as string;

    if (!region || !isValidDataRegion(region)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid region. Valid: ${DATA_REGIONS.join(", ")}`,
      });
    }

    // Immutability check
    if (tenantRegions.has(tenantId)) {
      const existing = tenantRegions.get(tenantId);
      return reply.code(409).send({
        ok: false,
        error: `Tenant already assigned to region "${existing}". Region is immutable.`,
      });
    }

    const meta = getRegionMetadata(region);
    if (meta?.status === "planned") {
      return reply.code(400).send({
        ok: false,
        error: `Region "${region}" is not yet active.`,
      });
    }

    tenantRegions.set(tenantId, region);
    return {
      ok: true,
      tenantId,
      dataRegion: region,
      immutable: true,
      assignedAt: new Date().toISOString(),
    };
  });

  // POST /residency/transfer-agreements — create a data transfer agreement
  app.post("/residency/transfer-agreements", async (request, reply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const {
      tenantId,
      sourceRegion,
      targetRegion,
      purpose,
      legalBasis,
      consentEvidenceRef,
      approvedBy,
      expiresAt,
    } = body as Record<string, string>;

    if (!tenantId || !sourceRegion || !targetRegion || !purpose || !legalBasis) {
      return reply.code(400).send({
        ok: false,
        error: "Missing required fields: tenantId, sourceRegion, targetRegion, purpose, legalBasis",
      });
    }

    if (!isValidDataRegion(sourceRegion) || !isValidDataRegion(targetRegion)) {
      return reply.code(400).send({ ok: false, error: "Invalid region" });
    }

    // Validate the transfer
    const validation = validateCrossBorderTransfer(
      sourceRegion as DataRegion,
      targetRegion as DataRegion,
      !!consentEvidenceRef,
      true // creating agreement counts
    );

    const agreement: DataTransferAgreement = {
      id: `dta-${randomBytes(8).toString("hex")}`,
      tenantId,
      sourceRegion: sourceRegion as DataRegion,
      targetRegion: targetRegion as DataRegion,
      purpose,
      legalBasis,
      consentEvidenceRef: consentEvidenceRef || "",
      approvedBy: approvedBy || "admin",
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || new Date(Date.now() + 365 * 86_400_000).toISOString(),
      status: "active",
    };

    transferAgreements.set(agreement.id, agreement);

    return {
      ok: true,
      agreement,
      transferValidation: validation,
    };
  });

  // GET /residency/transfer-agreements — list agreements
  app.get("/residency/transfer-agreements", async (request) => {
    const query = (request.query as Record<string, string>) || {};
    let agreements = [...transferAgreements.values()];

    if (query.tenantId) {
      agreements = agreements.filter((a) => a.tenantId === query.tenantId);
    }
    if (query.status) {
      agreements = agreements.filter((a) => a.status === query.status);
    }

    return { ok: true, agreements, total: agreements.length };
  });

  // POST /residency/validate-transfer — check if transfer is allowed
  app.post("/residency/validate-transfer", async (request, reply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const { sourceRegion, targetRegion, hasConsent, hasAgreement } = body as {
      sourceRegion: string;
      targetRegion: string;
      hasConsent: boolean;
      hasAgreement: boolean;
    };

    if (!sourceRegion || !targetRegion) {
      return reply.code(400).send({ ok: false, error: "sourceRegion and targetRegion required" });
    }

    if (!isValidDataRegion(sourceRegion) || !isValidDataRegion(targetRegion)) {
      return reply.code(400).send({ ok: false, error: "Invalid region" });
    }

    const result = validateCrossBorderTransfer(
      sourceRegion as DataRegion,
      targetRegion as DataRegion,
      !!hasConsent,
      !!hasAgreement
    );

    return { ok: true, ...result };
  });
}

// ── Helpers ────────────────────────────────────────────────────

function safeResolvePg(region: DataRegion): string | null {
  try {
    return resolveRegionPgUrl(region);
  } catch {
    return null;
  }
}
