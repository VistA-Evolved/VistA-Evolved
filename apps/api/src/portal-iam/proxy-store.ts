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

import { randomBytes } from 'node:crypto';
import type {
  ProxyInvitation,
  InvitationStatus,
  PolicyResult,
  PatientRelationship,
} from './types.js';
import { addPatientProfile } from './portal-user-store.js';
import { evaluateSensitivity, getProxiesForPatient } from '../services/portal-sensitivity.js';
import { portalAudit } from '../services/portal-audit.js';
import { log } from '../lib/logger.js';
import { listTenants } from '../config/tenant-config.js';

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

type ProxyInvitationRepoRow = {
  id: string;
  tenantId?: string;
  fromUserId?: string;
  toEmail?: string;
  relationship?: string;
  status?: InvitationStatus;
  token?: string | null;
  permissionsJson?: string | null;
  createdAt?: string;
  expiresAt?: string;
  acceptedAt?: string | null;
  patientDfn?: string | null;
  patientName?: string | null;
  requestorName?: string | null;
  requestedAccessLevel?: ProxyInvitation['requestedAccessLevel'] | null;
  reason?: string | null;
  verificationDocRef?: string | null;
  patientAge?: number | null;
  policyResultJson?: string | null;
  respondedAt?: string | null;
};

type ProxyInvitationRepo = {
  upsert(d: any): Promise<any>;
  findByTenant?(
    tenantId: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<ProxyInvitationRepoRow[]>;
};

/* Phase 146: DB repo wiring */
let proxyDbRepo: ProxyInvitationRepo | null = null;
export function initProxyStoreRepo(repo: ProxyInvitationRepo | null): void {
  proxyDbRepo = repo;
  if (repo) {
    void rehydrateProxyInvitations(repo);
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function genId(): string {
  return `inv-${randomBytes(12).toString('hex')}`;
}

function now(): string {
  return new Date().toISOString();
}

function parseJsonObject<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toProxyInvitationRepoRow(inv: ProxyInvitation): Record<string, unknown> {
  return {
    id: inv.id,
    tenantId: inv.tenantId,
    fromUserId: inv.requestorUserId,
    toEmail: '',
    relationship: inv.relationship,
    status: inv.status,
    token: inv.patientDfn,
    permissionsJson: JSON.stringify({
      requestedAccessLevel: inv.requestedAccessLevel,
      reason: inv.reason,
      verificationDocRef: inv.verificationDocRef,
      patientName: inv.patientName,
      patientAge: inv.patientAge,
      policyResult: inv.policyResult,
      respondedAt: inv.respondedAt,
      requestorName: inv.requestorName,
    }),
    createdAt: inv.createdAt,
    expiresAt: inv.expiresAt,
    acceptedAt: inv.status === 'accepted' ? inv.respondedAt : null,
    patientDfn: inv.patientDfn,
    patientName: inv.patientName,
    requestorName: inv.requestorName,
    requestedAccessLevel: inv.requestedAccessLevel,
    reason: inv.reason,
    verificationDocRef: inv.verificationDocRef,
    patientAge: inv.patientAge,
    policyResultJson: JSON.stringify(inv.policyResult),
    respondedAt: inv.respondedAt,
  };
}

function fromProxyInvitationRepoRow(row: ProxyInvitationRepoRow | null | undefined): ProxyInvitation | null {
  if (!row?.id || !row.tenantId || !row.fromUserId || !row.relationship || !row.status || !row.createdAt) return null;
  const legacy = parseJsonObject<Record<string, unknown>>(row.permissionsJson, {});
  const policyResult = row.policyResultJson
    ? parseJsonObject<PolicyResult | null>(row.policyResultJson, null)
    : ((legacy.policyResult as PolicyResult | undefined) ?? null);
  const patientName = row.patientName ?? (typeof legacy.patientName === 'string' ? legacy.patientName : '');
  const requestorName =
    row.requestorName ?? (typeof legacy.requestorName === 'string' ? legacy.requestorName : '');
  const reason = row.reason ?? (typeof legacy.reason === 'string' ? legacy.reason : '');
  const requestedAccessLevel =
    row.requestedAccessLevel ??
    ((legacy.requestedAccessLevel as ProxyInvitation['requestedAccessLevel'] | undefined) ?? 'read_only');

  return {
    id: row.id,
    tenantId: row.tenantId,
    requestorUserId: row.fromUserId,
    requestorName,
    patientDfn: row.patientDfn ?? row.token ?? '',
    patientName,
    relationship: row.relationship as PatientRelationship,
    requestedAccessLevel,
    reason,
    verificationDocRef:
      row.verificationDocRef ??
      (typeof legacy.verificationDocRef === 'string' ? legacy.verificationDocRef : null),
    patientAge:
      row.patientAge ??
      (typeof legacy.patientAge === 'number' ? legacy.patientAge : null),
    policyResult,
    status: row.status,
    createdAt: row.createdAt,
    respondedAt:
      row.respondedAt ??
      (typeof legacy.respondedAt === 'string' ? legacy.respondedAt : row.acceptedAt ?? null),
    expiresAt: row.expiresAt ?? row.createdAt,
  };
}

async function rehydrateProxyInvitations(repo: ProxyInvitationRepo): Promise<void> {
  if (!repo.findByTenant) return;
  try {
    let loaded = 0;
    const tenantIds = new Set<string>(['default']);
    for (const tenant of listTenants()) {
      if (tenant.tenantId?.trim()) {
        tenantIds.add(tenant.tenantId.trim());
      }
    }
    for (const tenantId of tenantIds) {
      let offset = 0;
      const pageSize = 1000;
      while (true) {
        const rows = (await repo.findByTenant(tenantId, { limit: pageSize, offset })) || [];
        for (const row of rows) {
          const invitation = fromProxyInvitationRepoRow(row);
          if (invitation) {
            invitations.set(invitation.id, invitation);
            loaded++;
          }
        }
        if (rows.length < pageSize) break;
        offset += pageSize;
      }
    }
    if (loaded > 0) {
      log.info('Portal proxy invitations rehydrated from PG', { count: loaded });
    }
  } catch (err: any) {
    log.warn('Portal proxy invitation rehydration failed', { error: err?.message });
  }
}

/* ------------------------------------------------------------------ */
/* Policy Evaluation                                                    */
/* ------------------------------------------------------------------ */

function evaluateProxyPolicy(
  tenantId: string,
  patientDfn: string,
  patientAge: number | null,
  relationship: PatientRelationship
): PolicyResult {
  const warnings: string[] = [];
  const blockedRules: string[] = [];

  // Check max proxies
  const existing = getProxiesForPatient(tenantId, patientDfn);
  if (existing.length >= MAX_PROXIES_PER_PATIENT) {
    blockedRules.push('max_proxies_exceeded');
  }

  // Age policy: minors (< 18) can only have parent/guardian/legal_representative proxies
  if (patientAge !== null && patientAge < 18) {
    const allowedForMinor: PatientRelationship[] = ['parent', 'guardian', 'legal_representative'];
    if (!allowedForMinor.includes(relationship)) {
      blockedRules.push('minor_restricted_relationship');
    }
  }

  // Protected minor sensitivity check (Phase 28 policy)
  if (patientAge !== null && patientAge >= 13 && patientAge < 18) {
    warnings.push('Protected minor - some record sections may be withheld from proxy');
  }

  // Sensitivity evaluation
  const age = patientAge ?? 30; // default adult if unknown
  const sensitivity = evaluateSensitivity({
    isProxy: true,
    isMinor: age < 18,
    patientAge: age,
    dataCategories: ['behavioral_health', 'substance_abuse', 'hiv', 'reproductive'],
  });
  const withheldSections = sensitivity.filter((f) => f.withheld);
  if (withheldSections.length > 0) {
    warnings.push(
      `${withheldSections.length} record section(s) will be restricted for proxy access`
    );
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
  tenantId: string;
  requestorUserId: string;
  requestorName: string;
  patientDfn: string;
  patientName: string;
  relationship: PatientRelationship;
  requestedAccessLevel: 'full' | 'read_only' | 'limited';
  reason: string;
  verificationDocRef?: string;
  patientAge?: number;
}): ProxyInvitation {
  // Check pending invitation cap
  const pending = getPendingInvitationsForUser(opts.tenantId, opts.requestorUserId);
  if (pending.length >= MAX_PENDING_PER_USER) {
    throw new Error('Maximum pending proxy invitations reached');
  }

  // Check for duplicate pending invitation
  const dup = Array.from(invitations.values()).find(
    (inv) =>
      inv.tenantId === opts.tenantId &&
      inv.requestorUserId === opts.requestorUserId &&
      inv.patientDfn === opts.patientDfn &&
      inv.status === 'pending'
  );
  if (dup) {
    throw new Error('A pending invitation for this patient already exists');
  }

  // Evaluate policies
  const policyResult = evaluateProxyPolicy(
    opts.tenantId,
    opts.patientDfn,
    opts.patientAge ?? null,
    opts.relationship
  );

  const status: InvitationStatus = policyResult.allowed ? 'pending' : 'blocked_by_policy';

  const invitation: ProxyInvitation = {
    id: genId(),
    tenantId: opts.tenantId,
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

  // Phase 146: Write-through to PG
  proxyDbRepo
    ?.upsert(toProxyInvitationRepoRow(invitation))
    .catch(() => {});

  portalAudit('portal.proxy.grant', policyResult.allowed ? 'success' : 'failure', opts.patientDfn, {
    tenantId: opts.tenantId,
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
  tenantId: string,
  response: 'accepted' | 'declined',
  respondedBy: string
): ProxyInvitation | null {
  const inv = invitations.get(invitationId);
  if (!inv) return null;
  if (inv.tenantId !== tenantId) return null;
  if (inv.status !== 'pending') return null;

  // Check expiry
  if (new Date(inv.expiresAt).getTime() < Date.now()) {
    inv.status = 'expired';
    return inv;
  }

  inv.status = response;
  inv.respondedAt = now();

  if (response === 'accepted') {
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
    response === 'accepted' ? 'portal.proxy.grant' : 'portal.proxy.revoke',
    'success',
    inv.patientDfn,
    {
      tenantId: inv.tenantId,
      detail: {
        invitationId: inv.id,
        response,
        respondedBy,
      },
    }
  );

  log.info(`Proxy invitation ${invitationId} ${response}`);

  // Phase 146: Write-through invitation response
  proxyDbRepo
    ?.upsert(toProxyInvitationRepoRow(inv))
    .catch(() => {});

  return inv;
}

/* ------------------------------------------------------------------ */
/* Cancel Invitation                                                    */
/* ------------------------------------------------------------------ */

export function cancelInvitation(invitationId: string, tenantId: string, cancelledBy: string): boolean {
  const inv = invitations.get(invitationId);
  if (!inv || inv.tenantId !== tenantId || inv.status !== 'pending') return false;

  inv.status = 'cancelled';
  inv.respondedAt = now();

  // Phase 146: Write-through invitation cancel
  proxyDbRepo
    ?.upsert(toProxyInvitationRepoRow(inv))
    .catch(() => {});

  log.info(`Proxy invitation cancelled: ${invitationId} by ${cancelledBy}`);
  return true;
}

/* ------------------------------------------------------------------ */
/* Queries                                                              */
/* ------------------------------------------------------------------ */

export function getInvitation(id: string): ProxyInvitation | null {
  return invitations.get(id) ?? null;
}

export function getPendingInvitationsForUser(tenantId: string, userId: string): ProxyInvitation[] {
  return Array.from(invitations.values()).filter(
    (inv) => inv.tenantId === tenantId && inv.requestorUserId === userId && inv.status === 'pending'
  );
}

export function getInvitationsForPatient(tenantId: string, patientDfn: string): ProxyInvitation[] {
  return Array.from(invitations.values()).filter(
    (inv) => inv.tenantId === tenantId && inv.patientDfn === patientDfn
  );
}

export function getInvitationsForUser(tenantId: string, userId: string): ProxyInvitation[] {
  return Array.from(invitations.values()).filter(
    (inv) => inv.tenantId === tenantId && inv.requestorUserId === userId
  );
}

/* ------------------------------------------------------------------ */
/* Expiry cleanup                                                       */
/* ------------------------------------------------------------------ */

setInterval(() => {
  const cutoff = Date.now();
  for (const [_id, inv] of invitations) {
    if (inv.status === 'pending' && new Date(inv.expiresAt).getTime() < cutoff) {
      inv.status = 'expired';
    }
  }
}, 60_000);

/* ------------------------------------------------------------------ */
/* Stats                                                                */
/* ------------------------------------------------------------------ */

export function getProxyInvitationStats(tenantId?: string): {
  total: number;
  byStatus: Record<string, number>;
} {
  const byStatus: Record<string, number> = {};
  const scopedInvitations = tenantId
    ? Array.from(invitations.values()).filter((inv) => inv.tenantId === tenantId)
    : Array.from(invitations.values());
  for (const inv of scopedInvitations) {
    byStatus[inv.status] = (byStatus[inv.status] || 0) + 1;
  }
  return { total: scopedInvitations.length, byStatus };
}
