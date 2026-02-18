/**
 * Proxy Invitation Store — Phase 29
 *
 * Manages the proxy invitation workflow:
 * 1. Portal user requests proxy connection (guardian/caregiver)
 * 2. System evaluates sensitivity + age policies (Phase 28 rules)
 * 3. Patient accepts/declines
 * 4. On acceptance, proxy profile is added to requesting user
 *
 * Integrates with portal-sensitivity.ts for policy enforcement.
 */

import { randomBytes } from "node:crypto";
import type {
  ProxyInvitation,
  InvitationStatus,
  PolicyResult,
  PatientRelationship,
} from "./types.js";
import { addPatientProfile, getUserById } from "./portal-user-store.js";
import { evaluateSensitivity, getProxiesForPatient } from "../services/portal-sensitivity.js";
import { portalAudit } from "../services/portal-audit.js";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Configuration                                                        */
/* ------------------------------------------------------------------ */

const INVITATION_TTL_MS = Number(process.env.PROXY_INVITE_TTL_MS || 7 * 24 * 60 * 60 * 1000); // 7 days
const MAX_PENDING_PER_USER = 5;
const MAX_PROXIES_PER_PATIENT = 10;

/* ------------------------------------------------------------------ */
/* Store                                                                */
/* ------------------------------------------------------------------ */

const invitations = new Map<string, ProxyInvitation>();

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function genId(): string {
  return `inv-${randomBytes(12).toString("hex")}`;
}

function now(): string {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ */
/* Policy Evaluation                                                    */
/* ------------------------------------------------------------------ */

function evaluateProxyPolicy(
  patientDfn: string,
  patientAge: number | null,
  relationship: PatientRelationship
): PolicyResult {
  const warnings: string[] = [];
  const blockedRules: string[] = [];

  // Check max proxies
  const existing = getProxiesForPatient(patientDfn);
  if (existing.length >= MAX_PROXIES_PER_PATIENT) {
    blockedRules.push("max_proxies_exceeded");
  }

  // Age policy: minors (< 18) can only have parent/guardian/legal_representative proxies
  if (patientAge !== null && patientAge < 18) {
    const allowedForMinor: PatientRelationship[] = ["parent", "guardian", "legal_representative"];
    if (!allowedForMinor.includes(relationship)) {
      blockedRules.push("minor_restricted_relationship");
    }
  }

  // Protected minor sensitivity check (Phase 28 policy)
  if (patientAge !== null && patientAge >= 13 && patientAge < 18) {
    warnings.push("Protected minor - some record sections may be withheld from proxy");
  }

  // Sensitivity evaluation
  const age = patientAge ?? 30; // default adult if unknown
  const sensitivity = evaluateSensitivity({
    isProxy: true,
    isMinor: age < 18,
    patientAge: age,
    dataCategories: ["behavioral_health", "substance_abuse", "hiv", "reproductive"],
  });
  const withheldSections = sensitivity.filter((f) => f.withheld);
  if (withheldSections.length > 0) {
    warnings.push(`${withheldSections.length} record section(s) will be restricted for proxy access`);
  }

  return {
    allowed: blockedRules.length === 0,
    blockedRules,
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/* Create Invitation                                                    */
/* ------------------------------------------------------------------ */

export function createProxyInvitation(opts: {
  requestorUserId: string;
  requestorName: string;
  patientDfn: string;
  patientName: string;
  relationship: PatientRelationship;
  requestedAccessLevel: "full" | "read_only" | "limited";
  reason: string;
  verificationDocRef?: string;
  patientAge?: number;
}): ProxyInvitation {
  // Check pending invitation cap
  const pending = getPendingInvitationsForUser(opts.requestorUserId);
  if (pending.length >= MAX_PENDING_PER_USER) {
    throw new Error("Maximum pending proxy invitations reached");
  }

  // Check for duplicate pending invitation
  const dup = Array.from(invitations.values()).find(
    (inv) =>
      inv.requestorUserId === opts.requestorUserId &&
      inv.patientDfn === opts.patientDfn &&
      inv.status === "pending"
  );
  if (dup) {
    throw new Error("A pending invitation for this patient already exists");
  }

  // Evaluate policies
  const policyResult = evaluateProxyPolicy(
    opts.patientDfn,
    opts.patientAge ?? null,
    opts.relationship
  );

  const status: InvitationStatus = policyResult.allowed ? "pending" : "blocked_by_policy";

  const invitation: ProxyInvitation = {
    id: genId(),
    requestorUserId: opts.requestorUserId,
    requestorName: opts.requestorName,
    patientDfn: opts.patientDfn,
    patientName: opts.patientName,
    relationship: opts.relationship,
    requestedAccessLevel: opts.requestedAccessLevel,
    reason: opts.reason,
    verificationDocRef: opts.verificationDocRef ?? null,
    patientAge: opts.patientAge ?? null,
    policyResult,
    status,
    createdAt: now(),
    respondedAt: null,
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS).toISOString(),
  };

  invitations.set(invitation.id, invitation);

  portalAudit("portal.proxy.grant", policyResult.allowed ? "success" : "failure", opts.patientDfn, {
    detail: {
      invitationId: invitation.id,
      relationship: opts.relationship,
      requestorName: opts.requestorName,
      blocked: !policyResult.allowed,
    },
  });

  log.info(`Proxy invitation created: ${invitation.id} (status: ${status})`);
  return invitation;
}

/* ------------------------------------------------------------------ */
/* Respond to Invitation                                                */
/* ------------------------------------------------------------------ */

export function respondToInvitation(
  invitationId: string,
  response: "accepted" | "declined",
  respondedBy: string
): ProxyInvitation | null {
  const inv = invitations.get(invitationId);
  if (!inv) return null;
  if (inv.status !== "pending") return null;

  // Check expiry
  if (new Date(inv.expiresAt).getTime() < Date.now()) {
    inv.status = "expired";
    return inv;
  }

  inv.status = response;
  inv.respondedAt = now();

  if (response === "accepted") {
    // Add patient profile to requesting user
    const profile = addPatientProfile(inv.requestorUserId, {
      patientDfn: inv.patientDfn,
      patientName: inv.patientName,
      relationship: inv.relationship,
      isSelf: false,
      accessLevel: inv.requestedAccessLevel,
      verified: true,
    });

    if (!profile) {
      log.warn(`Failed to add proxy profile for invitation ${invitationId}`);
    }
  }

  portalAudit(
    response === "accepted" ? "portal.proxy.grant" : "portal.proxy.revoke",
    "success",
    inv.patientDfn,
    {
      detail: {
        invitationId: inv.id,
        response,
        respondedBy,
      },
    }
  );

  log.info(`Proxy invitation ${invitationId} ${response}`);
  return inv;
}

/* ------------------------------------------------------------------ */
/* Cancel Invitation                                                    */
/* ------------------------------------------------------------------ */

export function cancelInvitation(invitationId: string, cancelledBy: string): boolean {
  const inv = invitations.get(invitationId);
  if (!inv || inv.status !== "pending") return false;

  inv.status = "cancelled";
  inv.respondedAt = now();

  log.info(`Proxy invitation cancelled: ${invitationId} by ${cancelledBy}`);
  return true;
}

/* ------------------------------------------------------------------ */
/* Queries                                                              */
/* ------------------------------------------------------------------ */

export function getInvitation(id: string): ProxyInvitation | null {
  return invitations.get(id) ?? null;
}

export function getPendingInvitationsForUser(userId: string): ProxyInvitation[] {
  return Array.from(invitations.values()).filter(
    (inv) => inv.requestorUserId === userId && inv.status === "pending"
  );
}

export function getInvitationsForPatient(patientDfn: string): ProxyInvitation[] {
  return Array.from(invitations.values()).filter(
    (inv) => inv.patientDfn === patientDfn
  );
}

export function getInvitationsForUser(userId: string): ProxyInvitation[] {
  return Array.from(invitations.values()).filter(
    (inv) => inv.requestorUserId === userId
  );
}

/* ------------------------------------------------------------------ */
/* Expiry cleanup                                                       */
/* ------------------------------------------------------------------ */

setInterval(() => {
  const cutoff = Date.now();
  for (const [id, inv] of invitations) {
    if (inv.status === "pending" && new Date(inv.expiresAt).getTime() < cutoff) {
      inv.status = "expired";
    }
  }
}, 60_000);

/* ------------------------------------------------------------------ */
/* Stats                                                                */
/* ------------------------------------------------------------------ */

export function getProxyInvitationStats(): {
  total: number;
  byStatus: Record<string, number>;
} {
  const byStatus: Record<string, number> = {};
  for (const inv of invitations.values()) {
    byStatus[inv.status] = (byStatus[inv.status] || 0) + 1;
  }
  return { total: invitations.size, byStatus };
}
