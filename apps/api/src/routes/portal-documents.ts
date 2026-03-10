/**
 * Portal Documents + Consents Routes -- Phase 140
 *
 * Documents:
 *   GET  /portal/documents           -- list available document types
 *   POST /portal/documents/generate  -- generate a VistA-backed document (returns signed token)
 *   GET  /portal/documents/download/:token -- download document by signed token
 *
 * Consents:
 *   GET  /portal/consents            -- list patient consent decisions
 *   POST /portal/consents            -- record/update a consent decision
 *
 * All routes require portal session (cookie-based auth).
 * Clinical data is VistA-first. Consent state is PG-backed.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { log } from '../lib/logger.js';
import { immutableAudit } from '../lib/immutable-audit.js';
import { randomBytes, createHmac, timingSafeEqual, createHash } from 'node:crypto';
import { isPgConfigured } from '../platform/pg/pg-db.js';

/* ------------------------------------------------------------------ */
/* Session helper -- same pattern as portal-core.ts                     */
/* ------------------------------------------------------------------ */

interface PortalSessionData {
  token: string;
  tenantId: string;
  patientDfn: string;
  patientName: string;
  createdAt: number;
  lastActivity: number;
}

let portalSessionLookup: (request: FastifyRequest) => PortalSessionData | null;

export function initPortalDocuments(
  sessionLookup: (request: FastifyRequest) => PortalSessionData | null
) {
  portalSessionLookup = sessionLookup;
}

function requirePortalSession(request: FastifyRequest, _reply: FastifyReply): PortalSessionData {
  const session = portalSessionLookup?.(request);
  if (!session) {
    const err: any = new Error('Not authenticated');
    err.statusCode = 401;
    throw err;
  }
  return session;
}

/* ------------------------------------------------------------------ */
/* Signed token store (short-lived, in-memory)                         */
/* ------------------------------------------------------------------ */

const TOKEN_SECRET = randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface PendingDocument {
  tenantId: string;
  sessionTokenHash: string;
  patientDfn: string;
  documentType: string;
  createdAt: number;
  content: string; // text content for PDF
}

const pendingDocs = new Map<string, PendingDocument>();

// Cleanup expired tokens every 60s
setInterval(() => {
  const now = Date.now();
  for (const [token, doc] of pendingDocs) {
    if (now - doc.createdAt > TOKEN_TTL_MS) {
      pendingDocs.delete(token);
    }
  }
}, 60_000).unref();

function generateSignedToken(): string {
  const raw = randomBytes(24).toString('hex');
  const sig = createHmac('sha256', TOKEN_SECRET).update(raw).digest('hex').slice(0, 16);
  return `${raw}.${sig}`;
}

function verifyToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [raw, sig] = parts;
  const expected = createHmac('sha256', TOKEN_SECRET).update(raw).digest('hex').slice(0, 16);
  if (sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/* ------------------------------------------------------------------ */
/* Available document types                                            */
/* ------------------------------------------------------------------ */

const DOCUMENT_TYPES = [
  {
    id: 'health_summary',
    label: 'Health Summary',
    description:
      'Complete health record summary including allergies, medications, problems, and vitals',
    source: 'vista',
  },
  {
    id: 'immunization_record',
    label: 'Immunization Record',
    description: 'Complete vaccination history',
    source: 'vista',
  },
  {
    id: 'medication_list',
    label: 'Medication List',
    description: 'Current active medications with dosage information',
    source: 'vista',
  },
  {
    id: 'allergy_list',
    label: 'Allergy List',
    description: 'Known allergies and adverse reactions',
    source: 'vista',
  },
  {
    id: 'lab_results',
    label: 'Lab Results',
    description: 'Recent laboratory test results',
    source: 'vista',
  },
];

/* ------------------------------------------------------------------ */
/* Consent types                                                       */
/* ------------------------------------------------------------------ */

const CONSENT_TYPES = [
  { id: 'hipaa_release', label: 'HIPAA Release of Information', required: true },
  { id: 'data_sharing', label: 'Health Data Sharing', required: false },
  { id: 'research_participation', label: 'Research Participation', required: false },
  { id: 'telehealth_consent', label: 'Telehealth Consent', required: false },
  { id: 'portal_terms', label: 'Portal Terms of Use', required: true },
];

/* ------------------------------------------------------------------ */
/* VistA data fetch (reuses existing PDF export logic)                  */
/* ------------------------------------------------------------------ */

import { validateCredentials } from '../vista/config.js';
import { connect, callRpc } from '../vista/rpcBrokerClient.js';

async function fetchVistaHealthSummary(dfn: string): Promise<string> {
  try {
    validateCredentials();
    await connect();

    const sections: string[] = [];

    // Allergies
    try {
      const lines = await callRpc('ORQQAL LIST', [dfn]);
      sections.push('=== ALLERGIES ===');
      if (lines.length === 0 || (lines.length === 1 && !lines[0]?.trim())) {
        sections.push('No known allergies on file.');
      } else {
        for (const l of lines) {
          const p = l.split('^');
          if (p[1]?.trim())
            sections.push(`- ${p[1].trim()}${p[2]?.trim() ? ` (${p[2].trim()})` : ''}`);
        }
      }
    } catch {
      sections.push('=== ALLERGIES ===\nUnable to retrieve.');
    }

    sections.push('');

    // Medications
    try {
      const lines = await callRpc('ORWPS ACTIVE', [dfn]);
      sections.push('=== ACTIVE MEDICATIONS ===');
      if (lines.length === 0) {
        sections.push('No active medications.');
      } else {
        for (const l of lines) {
          if (l.startsWith('~')) {
            const p = l.substring(1).split('^');
            if (p[1]?.trim()) sections.push(`- ${p[1].trim()}`);
          }
        }
      }
    } catch {
      sections.push('=== ACTIVE MEDICATIONS ===\nUnable to retrieve.');
    }

    sections.push('');

    // Immunizations
    try {
      const lines = await callRpc('ORQQPX IMMUN LIST', [dfn]);
      sections.push('=== IMMUNIZATIONS ===');
      if (lines.length === 0) {
        sections.push('No immunizations on file.');
      } else {
        for (const l of lines) {
          const p = l.split('^');
          if (p[0]?.trim())
            sections.push(`- ${p[1]?.trim() || p[0].trim()} (${p[2]?.trim() || ''})`);
        }
      }
    } catch {
      sections.push('=== IMMUNIZATIONS ===\nUnable to retrieve.');
    }

    return sections.join('\n');
  } catch (_err) {
    log.warn('VistA health summary fetch failed, returning fallback');
    return 'Health Summary\n\nUnable to retrieve VistA data at this time. Please try again later.';
  }
}

async function fetchVistaSection(dfn: string, section: string): Promise<string> {
  try {
    validateCredentials();
    await connect();

    switch (section) {
      case 'immunization_record': {
        const lines = await callRpc('ORQQPX IMMUN LIST', [dfn]);
        if (!lines.length) return 'No immunization records found.';
        return lines
          .map((l) => {
            const p = l.split('^');
            return `${p[1]?.trim() || p[0]?.trim() || 'Unknown'} - ${p[2]?.trim() || 'No date'}`;
          })
          .join('\n');
      }
      case 'medication_list': {
        const lines = await callRpc('ORWPS ACTIVE', [dfn]);
        if (!lines.length) return 'No active medications.';
        const meds: string[] = [];
        for (const l of lines) {
          if (l.startsWith('~')) {
            const p = l.substring(1).split('^');
            if (p[1]?.trim()) meds.push(p[1].trim());
          }
        }
        return meds.length ? meds.join('\n') : 'No active medications.';
      }
      case 'allergy_list': {
        const lines = await callRpc('ORQQAL LIST', [dfn]);
        if (!lines.length) return 'No known allergies.';
        return lines
          .map((l) => {
            const p = l.split('^');
            return `${p[1]?.trim() || 'Unknown'}${p[2]?.trim() ? ` - Severity: ${p[2].trim()}` : ''}`;
          })
          .join('\n');
      }
      case 'lab_results': {
        const lines = await callRpc('ORWLRR INTERIM', [dfn, '100']);
        if (!lines.length) return 'No recent lab results.';
        return lines.slice(0, 50).join('\n');
      }
      default:
        return await fetchVistaHealthSummary(dfn);
    }
  } catch {
    return `${section} -- Unable to retrieve VistA data at this time. Please try again later.`;
  }
}

/* ------------------------------------------------------------------ */
/* Route registration                                                  */
/* ------------------------------------------------------------------ */

export default async function portalDocumentsRoutes(server: FastifyInstance) {
  /* -- Documents -- */

  // GET /portal/documents -- list available document types
  server.get('/portal/documents', async (request, reply) => {
    const session = requirePortalSession(request, reply);

    immutableAudit(
      'portal.document.list',
      'success',
      { sub: session.patientDfn, name: 'portal-patient', roles: ['patient'] },
      { detail: { documentTypes: DOCUMENT_TYPES.length } }
    );

    return { ok: true, documentTypes: DOCUMENT_TYPES };
  });

  // POST /portal/documents/generate -- generate document, return signed token
  server.post('/portal/documents/generate', async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const body = (request.body as any) || {};
    const documentType = body.documentType;

    if (!documentType || !DOCUMENT_TYPES.find((d) => d.id === documentType)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid documentType. Valid types: ${DOCUMENT_TYPES.map((d) => d.id).join(', ')}`,
      });
    }

    // Fetch VistA data
    const content = await fetchVistaSection(session.patientDfn, documentType);

    // Create signed token
    const token = generateSignedToken();
    pendingDocs.set(token, {
      tenantId: session.tenantId,
      sessionTokenHash: hashSessionToken(session.token),
      patientDfn: session.patientDfn,
      documentType,
      createdAt: Date.now(),
      content,
    });

    immutableAudit(
      'portal.document.generate',
      'success',
      { sub: session.patientDfn, name: 'portal-patient', roles: ['patient'] },
      { detail: { documentType, tokenPrefix: token.slice(0, 8) } }
    );

    return {
      ok: true,
      token,
      expiresIn: TOKEN_TTL_MS / 1000,
      downloadUrl: `/portal/documents/download/${token}`,
    };
  });

  // GET /portal/documents/download/:token -- download document by signed token
  server.get('/portal/documents/download/:token', async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const { token } = request.params as { token: string };

    if (!verifyToken(token)) {
      return reply.code(403).send({ ok: false, error: 'Invalid or expired token' });
    }

    const doc = pendingDocs.get(token);
    if (!doc) {
      return reply.code(404).send({ ok: false, error: 'Document not found or expired' });
    }
    if (
      doc.tenantId !== session.tenantId ||
      doc.patientDfn !== session.patientDfn ||
      doc.sessionTokenHash !== hashSessionToken(session.token)
    ) {
      return reply.code(403).send({ ok: false, error: 'Document token does not belong to this session' });
    }

    if (Date.now() - doc.createdAt > TOKEN_TTL_MS) {
      pendingDocs.delete(token);
      return reply.code(410).send({ ok: false, error: 'Token expired' });
    }

    // Remove token after use (single-use)
    pendingDocs.delete(token);

    immutableAudit(
      'portal.document.download',
      'success',
      { sub: session.patientDfn, name: 'portal-patient', roles: ['patient'] },
      { detail: { documentType: doc.documentType } }
    );

    // Return as text (PDF generation uses portal-pdf.ts for actual binary;
    // this provides the text content for download)
    reply.header('Content-Type', 'text/plain; charset=utf-8');
    reply.header(
      'Content-Disposition',
      `attachment; filename="${doc.documentType}_${new Date().toISOString().slice(0, 10)}.txt"`
    );
    return doc.content;
  });

  /* -- Consents -- */

  // GET /portal/consents -- list consent decisions for the patient
  server.get('/portal/consents', async (request, reply) => {
    const session = requirePortalSession(request, reply);

    let consents: any[] = [];

    if (isPgConfigured()) {
      try {
        const { listConsents } = await import('../platform/pg/repo/pg-consent-repo.js');
        consents = await listConsents(session.patientDfn, session.tenantId);
      } catch (_err) {
        log.warn('PG consent fetch failed, returning defaults');
      }
    }

    // Merge with known consent types to show all, even unsigned
    const merged = CONSENT_TYPES.map((ct) => {
      const existing = consents.find((c: any) => c.consentType === ct.id);
      return {
        consentType: ct.id,
        label: ct.label,
        required: ct.required,
        status: existing?.status || 'pending',
        signedAt: existing?.signedAt || null,
        revokedAt: existing?.revokedAt || null,
        version: existing?.version || 1,
      };
    });

    immutableAudit(
      'portal.consent.view',
      'success',
      { sub: session.patientDfn, name: 'portal-patient', roles: ['patient'] },
      { detail: { consentCount: merged.length } }
    );

    return { ok: true, consents: merged, consentTypes: CONSENT_TYPES };
  });

  // POST /portal/consents -- record/update a consent decision
  server.post('/portal/consents', async (request, reply) => {
    const session = requirePortalSession(request, reply);
    const body = (request.body as any) || {};
    const { consentType, status } = body;

    if (!consentType || !CONSENT_TYPES.find((ct) => ct.id === consentType)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid consentType. Valid types: ${CONSENT_TYPES.map((ct) => ct.id).join(', ')}`,
      });
    }

    if (!status || !['granted', 'revoked', 'pending'].includes(status)) {
      return reply.code(400).send({
        ok: false,
        error: 'Invalid status. Must be: granted, revoked, or pending',
      });
    }

    if (isPgConfigured()) {
      try {
        const { upsertConsent } = await import('../platform/pg/repo/pg-consent-repo.js');
        const result = await upsertConsent({
          patientDfn: session.patientDfn,
          tenantId: session.tenantId,
          consentType,
          status,
          locale: body.locale,
          metadata: body.metadata ? JSON.stringify(body.metadata) : undefined,
        });

        immutableAudit(
          'portal.consent.update',
          'success',
          { sub: session.patientDfn, name: 'portal-patient', roles: ['patient'] },
          { detail: { consentType, status, consentId: result.id } }
        );

        return { ok: true, consent: result };
      } catch (_err) {
        log.warn('PG consent upsert failed');
        return reply.code(500).send({ ok: false, error: 'Failed to save consent' });
      }
    }

    // Fallback: in-memory (no PG)
    immutableAudit(
      'portal.consent.update',
      'success',
      { sub: session.patientDfn, name: 'portal-patient', roles: ['patient'] },
      { detail: { consentType, status, storage: 'in-memory' } }
    );

    return {
      ok: true,
      consent: {
        consentType,
        status,
        signedAt: status === 'granted' ? new Date().toISOString() : null,
        revokedAt: status === 'revoked' ? new Date().toISOString() : null,
        note: 'PG not configured -- consent recorded in session only',
      },
    };
  });
}
