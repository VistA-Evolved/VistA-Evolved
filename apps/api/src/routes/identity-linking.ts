/**
 * Phase 169: Patient Identity Linking
 *
 * Secure identity verification + linking endpoints that connect
 * OIDC/portal user accounts to VistA patient records (DFN).
 *
 * Uses the existing portal_patient_identity PG table (migration v19).
 * Implements a staff-approval workflow for identity verification:
 *   1. Patient initiates a link request with identity proof
 *   2. Staff verifies identity against VistA demographics
 *   3. Link is established (or rejected)
 *
 * VistA-first reads:
 *   - ORWPT SELECT (lookup patient by name)
 *   - ORWPT ID INFO (demographics for verification)
 *
 * VistA data accessed for verification only — never stored in link record.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import { safeCallRpc } from "../lib/rpc-resilience.js";
import { immutableAudit } from "../lib/immutable-audit.js";
import { randomUUID, createHash } from "node:crypto";

// ── Types ───────────────────────────────────────────────────

export type LinkRequestStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "expired"
  | "revoked";

export interface IdentityLinkRequest {
  id: string;
  tenantId: string;
  requesterId: string;        // portal user ID or OIDC sub
  requesterDisplayName: string;
  patientDfn: string;
  relationship: PatientRelationship;
  /** DOB provided by requester for verification (not stored after verify) */
  verificationData: {
    last4Ssn?: string;        // hashed immediately, never stored raw
    dateOfBirth?: string;     // used for verify only
    fullName?: string;        // used for matching only
  };
  status: LinkRequestStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  expiresAt: string;
}

export type PatientRelationship =
  | "self"
  | "parent"
  | "guardian"
  | "spouse"
  | "caregiver"
  | "legal_representative"
  | "power_of_attorney";

export interface IdentityLink {
  id: string;
  tenantId: string;
  userId: string;             // OIDC sub or portal user ID
  patientDfn: string;
  relationship: PatientRelationship;
  displayName?: string;
  verifiedAt: string;
  verifiedBy: string;
  createdAt: string;
  revokedAt?: string;
}

// ── In-memory stores (PG table portal_patient_identity exists for links) ──

const linkRequests = new Map<string, IdentityLinkRequest>();
const identityLinks = new Map<string, IdentityLink>();

export function getLinkRequestCount(): number {
  return linkRequests.size;
}

export function getIdentityLinkCount(): number {
  return identityLinks.size;
}

// ── Helpers ─────────────────────────────────────────────────

function hashSensitive(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

const LINK_REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// Periodic cleanup of expired link requests
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startLinkRequestCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, req] of linkRequests) {
      if (now > new Date(req.expiresAt).getTime() && req.status === "pending") {
        linkRequests.delete(id);
      }
    }
    // Hard cap to prevent unbounded growth
    if (linkRequests.size > 1000) {
      const oldest = [...linkRequests.entries()]
        .sort((a, b) => new Date(a[1].createdAt).getTime() - new Date(b[1].createdAt).getTime());
      while (linkRequests.size > 1000 && oldest.length) {
        linkRequests.delete(oldest.shift()![0]);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();
}

export function stopLinkRequestCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

// ── Routes ──────────────────────────────────────────────────

export default async function identityLinkingRoutes(server: FastifyInstance) {
  startLinkRequestCleanup();
  // POST /portal/identity/request-link — patient initiates link request
  server.post("/portal/identity/request-link", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const body = (request.body as any) || {};
    const { patientDfn, relationship, dateOfBirth, last4Ssn, fullName } = body;

    if (!patientDfn || !relationship) {
      return reply.code(400).send({ ok: false, error: "patientDfn and relationship required" });
    }

    const validRelationships: PatientRelationship[] = [
      "self", "parent", "guardian", "spouse", "caregiver", "legal_representative", "power_of_attorney",
    ];
    if (!validRelationships.includes(relationship)) {
      return reply.code(400).send({ ok: false, error: `Invalid relationship. Valid: ${validRelationships.join(", ")}` });
    }

    // Check for existing pending request
    const existing = Array.from(linkRequests.values()).find(
      (r) => r.requesterId === session.duz && r.patientDfn === patientDfn && r.status === "pending",
    );
    if (existing) {
      return reply.code(409).send({ ok: false, error: "Pending request already exists", requestId: existing.id });
    }

    const now = new Date();
    const linkReq: IdentityLinkRequest = {
      id: randomUUID(),
      tenantId: session.tenantId,
      requesterId: session.duz,
      requesterDisplayName: (session as any).displayName || session.duz,
      patientDfn,
      relationship,
      verificationData: {
        last4Ssn: last4Ssn ? hashSensitive(last4Ssn) : undefined,
        dateOfBirth: dateOfBirth || undefined,
        fullName: fullName || undefined,
      },
      status: "pending",
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + LINK_REQUEST_TTL_MS).toISOString(),
    };

    linkRequests.set(linkReq.id, linkReq);

    immutableAudit("identity.link_requested", "success", { sub: session.duz }, {
      tenantId: session.tenantId,
      detail: { requestId: linkReq.id, relationship, patientDfnHash: hashSensitive(patientDfn) },
    });

    return {
      ok: true,
      requestId: linkReq.id,
      status: "pending",
      expiresAt: linkReq.expiresAt,
      message: "Link request submitted for staff verification",
    };
  });

  // GET /admin/identity/pending-requests — staff views pending link requests
  server.get("/admin/identity/pending-requests", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const pending = Array.from(linkRequests.values())
      .filter((r) => r.tenantId === session.tenantId && r.status === "pending")
      .filter((r) => new Date(r.expiresAt) > new Date())
      .map((r) => ({
        id: r.id,
        requesterDisplayName: r.requesterDisplayName,
        relationship: r.relationship,
        hasVerificationData: !!(r.verificationData.dateOfBirth || r.verificationData.last4Ssn),
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
      }));

    return { ok: true, requests: pending, total: pending.length };
  });

  // GET /admin/identity/request/:id — staff views link request detail + VistA demographics
  server.get("/admin/identity/request/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    const linkReq = linkRequests.get(id);
    if (!linkReq) return reply.code(404).send({ ok: false, error: "Request not found" });
    if (linkReq.tenantId !== session.tenantId) return reply.code(403).send({ ok: false, error: "Forbidden" });

    // Fetch VistA demographics for verification
    let vistaDemo: Record<string, string> = {};
    const rpcUsed: string[] = [];
    try {
      const idInfo = await safeCallRpc("ORWPT ID INFO", [linkReq.patientDfn]);
      vistaDemo = parseIdInfo(idInfo);
      rpcUsed.push("ORWPT ID INFO");
    } catch {
      vistaDemo = { error: "VistA demographics unavailable" };
    }

    return {
      ok: true,
      request: {
        id: linkReq.id,
        requesterDisplayName: linkReq.requesterDisplayName,
        patientDfn: linkReq.patientDfn,
        relationship: linkReq.relationship,
        verificationData: {
          hasLast4Ssn: !!linkReq.verificationData.last4Ssn,
          hasDateOfBirth: !!linkReq.verificationData.dateOfBirth,
          hasFullName: !!linkReq.verificationData.fullName,
        },
        status: linkReq.status,
        createdAt: linkReq.createdAt,
        expiresAt: linkReq.expiresAt,
      },
      vistaPatient: vistaDemo,
      rpcUsed,
    };
  });

  // POST /admin/identity/request/:id/verify — staff approves link
  server.post("/admin/identity/request/:id/verify", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    const linkReq = linkRequests.get(id);
    if (!linkReq) return reply.code(404).send({ ok: false, error: "Request not found" });
    if (linkReq.tenantId !== session.tenantId) return reply.code(403).send({ ok: false, error: "Forbidden" });
    if (linkReq.status !== "pending") {
      return reply.code(409).send({ ok: false, error: `Request is ${linkReq.status}, not pending` });
    }

    // Check expiry
    if (new Date(linkReq.expiresAt) < new Date()) {
      linkReq.status = "expired";
      return reply.code(409).send({ ok: false, error: "Request has expired" });
    }

    // Create the identity link
    const link: IdentityLink = {
      id: randomUUID(),
      tenantId: linkReq.tenantId,
      userId: linkReq.requesterId,
      patientDfn: linkReq.patientDfn,
      relationship: linkReq.relationship,
      displayName: linkReq.requesterDisplayName,
      verifiedAt: new Date().toISOString(),
      verifiedBy: session.duz,
      createdAt: new Date().toISOString(),
    };

    identityLinks.set(link.id, link);
    linkReq.status = "verified";
    linkReq.reviewedBy = session.duz;
    linkReq.reviewedAt = new Date().toISOString();

    // Clear verification data after approval
    linkReq.verificationData = {};

    immutableAudit("identity.link_verified", "success", { sub: session.duz }, {
      tenantId: session.tenantId,
      detail: { linkId: link.id, requestId: linkReq.id, relationship: link.relationship },
    });

    return {
      ok: true,
      linkId: link.id,
      status: "verified",
      vistaGrounding: {
        targetTable: "portal_patient_identity (PG v19)",
        status: "integration-pending",
        nextSteps: [
          "Persist link to portal_patient_identity PG table",
          "Wire OIDC sub mapping when OIDC login is active",
        ],
      },
    };
  });

  // POST /admin/identity/request/:id/reject — staff rejects link
  server.post("/admin/identity/request/:id/reject", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    const linkReq = linkRequests.get(id);
    if (!linkReq) return reply.code(404).send({ ok: false, error: "Request not found" });
    if (linkReq.tenantId !== session.tenantId) return reply.code(403).send({ ok: false, error: "Forbidden" });
    if (linkReq.status !== "pending") {
      return reply.code(409).send({ ok: false, error: `Request is ${linkReq.status}, not pending` });
    }

    const body = (request.body as any) || {};
    linkReq.status = "rejected";
    linkReq.rejectionReason = body.reason || "Identity verification failed";
    linkReq.reviewedBy = session.duz;
    linkReq.reviewedAt = new Date().toISOString();

    // Clear verification data on rejection too
    linkReq.verificationData = {};

    immutableAudit("identity.link_rejected", "success", { sub: session.duz }, {
      tenantId: session.tenantId,
      detail: { requestId: linkReq.id, reason: linkReq.rejectionReason },
    });

    return { ok: true, status: "rejected", reason: linkReq.rejectionReason };
  });

  // GET /portal/identity/my-links — user views their identity links
  server.get("/portal/identity/my-links", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const links = Array.from(identityLinks.values())
      .filter((l) => l.tenantId === session.tenantId && l.userId === session.duz && !l.revokedAt)
      .map((l) => ({
        id: l.id,
        patientDfn: l.patientDfn,
        relationship: l.relationship,
        displayName: l.displayName,
        verifiedAt: l.verifiedAt,
      }));

    const requests = Array.from(linkRequests.values())
      .filter((r) => r.tenantId === session.tenantId && r.requesterId === session.duz)
      .map((r) => ({
        id: r.id,
        patientDfn: r.patientDfn,
        relationship: r.relationship,
        status: r.status,
        createdAt: r.createdAt,
      }));

    return { ok: true, links, pendingRequests: requests.filter((r) => r.status === "pending"), totalLinks: links.length };
  });

  // DELETE /portal/identity/link/:id — revoke a link
  server.delete("/portal/identity/link/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    const link = identityLinks.get(id);
    if (!link) return reply.code(404).send({ ok: false, error: "Link not found" });
    if (link.tenantId !== session.tenantId) return reply.code(403).send({ ok: false, error: "Forbidden" });

    // Only the user or staff can revoke
    if (link.userId !== session.duz && !(session as any).roles?.includes("admin")) {
      return reply.code(403).send({ ok: false, error: "Only link owner or admin can revoke" });
    }

    link.revokedAt = new Date().toISOString();

    immutableAudit("identity.link_revoked", "success", { sub: session.duz }, {
      tenantId: session.tenantId,
      detail: { linkId: link.id },
    });

    return { ok: true, status: "revoked" };
  });

  // GET /admin/identity/links — staff views all identity links
  server.get("/admin/identity/links", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const dfn = (request.query as any).dfn;
    const includeRevoked = (request.query as any).includeRevoked === "true";

    let links = Array.from(identityLinks.values())
      .filter((l) => l.tenantId === session.tenantId);
    if (dfn) links = links.filter((l) => l.patientDfn === dfn);
    if (!includeRevoked) links = links.filter((l) => !l.revokedAt);

    return {
      ok: true,
      links: links.map((l) => ({
        id: l.id,
        userId: l.userId,
        patientDfn: l.patientDfn,
        relationship: l.relationship,
        displayName: l.displayName,
        verifiedAt: l.verifiedAt,
        verifiedBy: l.verifiedBy,
        revokedAt: l.revokedAt,
      })),
      total: links.length,
    };
  });
}

// ── VistA ID info parser ────────────────────────────────────

function parseIdInfo(lines: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of lines) {
    const parts = line.split("^");
    if (parts.length >= 2) {
      const key = parts[0]?.trim();
      const value = parts[1]?.trim();
      if (key && value) result[key] = value;
    }
  }
  return result;
}
