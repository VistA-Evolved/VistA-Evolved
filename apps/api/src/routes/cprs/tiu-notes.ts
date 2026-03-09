/**
 * Phase 60 -- TIU Notes Parity: List / View / Create / Sign / Addendum / Titles
 *
 * Every endpoint follows the safety model established in Wave 2 (Phase 57):
 *   1. Validate inputs server-side (400 before any RPC)
 *   2. Check RPC availability via optionalRpc()
 *   3. WRITE calls: LOCK/action/UNLOCK with always-unlock
 *   4. Audit: metadata only -- NEVER log input args, PHI, or clinical content
 *   5. Return rpcUsed[] and vivianPresence for traceability
 *   6. Idempotency via DB-backed idempotencyGuard (Phase 154: Postgres-backed)
 *   7. Draft fallback when RPC unavailable
 *
 * Endpoints:
 *   GET  /vista/cprs/notes           -- TIU DOCUMENTS BY CONTEXT (signed + unsigned merge)
 *   GET  /vista/cprs/notes/text      -- TIU GET RECORD TEXT
 *   POST /vista/cprs/notes/create    -- TIU CREATE RECORD + TIU SET DOCUMENT TEXT
 *   POST /vista/cprs/notes/sign      -- TIU LOCK RECORD + TIU SIGN RECORD + TIU UNLOCK RECORD
 *   POST /vista/cprs/notes/addendum  -- TIU CREATE ADDENDUM RECORD + TIU SET DOCUMENT TEXT
 *   GET  /vista/cprs/notes/titles    -- TIU PERSONAL TITLE LIST
 */

import type { FastifyInstance } from 'fastify';
import { validateCredentials } from '../../vista/config.js';
import { connect, disconnect, getDuz } from '../../vista/rpcBrokerClient.js';
import { optionalRpc } from '../../vista/rpcCapabilities.js';
import { safeCallRpc, safeCallRpcWithList } from '../../lib/rpc-resilience.js';
import { audit } from '../../lib/audit.js';
import { log } from '../../lib/logger.js';
import { createDraft } from '../write-backs.js';
import { safeErr } from '../../lib/safe-error.js';
import { idempotencyGuard, idempotencyOnSend } from '../../middleware/idempotency.js';

/* ------------------------------------------------------------------ */
/* Phase 154: In-memory idempotency REMOVED.                           */
/* DB-backed idempotency via idempotencyGuard middleware (PG-backed).   */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Validation helpers                                                  */
/* ------------------------------------------------------------------ */

interface ValidationError {
  field: string;
  message: string;
}

function validateDfn(dfn: unknown): string | null {
  if (!dfn) return null;
  const s = String(dfn);
  return /^\d+$/.test(s) ? s : null;
}

function validateRequired(body: Record<string, unknown>, fields: string[]): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === '') {
      errors.push({ field: f, message: `${f} is required` });
    }
  }
  return errors;
}

function buildTiuTextBuffer(noteText: unknown): Record<string, string> {
  const textData: Record<string, string> = { HDR: '1^1' };
  String(noteText || '')
    .split(/\r?\n/)
    .forEach((line, index) => {
      textData[`TEXT,${index + 1},0`] = line;
    });
  return textData;
}

function parseTiuLineCount(lines: string[]): number {
  for (const line of lines) {
    const match = line.match(/Line Count:\s*(\d+)/i);
    if (match) return parseInt(match[1], 10) || 0;
  }
  return -1;
}

function normalizeExpectedNoteLines(noteText: unknown): string[] {
  return String(noteText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function tiuReadbackContainsExpectedText(lines: string[], noteText: unknown): boolean {
  const expected = normalizeExpectedNoteLines(noteText);
  if (expected.length === 0) return false;
  const haystack = lines.map((line) => line.trim()).filter((line) => line.length > 0);
  return expected.every((line) => haystack.includes(line));
}

/* getIdempotencyKey removed in Phase 154 -- DB-backed middleware uses Idempotency-Key header */

function getActor(request: any): string {
  return (request as any).session?.duz ?? (request as any).session?.userName ?? 'unknown';
}

function resolveTenantId(request: any): string | null {
  const requestTenantId =
    typeof request?.tenantId === 'string' && request.tenantId.trim().length > 0
      ? request.tenantId.trim()
      : undefined;
  const sessionTenantId =
    typeof request?.session?.tenantId === 'string' && request.session.tenantId.trim().length > 0
      ? request.session.tenantId.trim()
      : undefined;
  const headerTenantId = request?.headers?.['x-tenant-id'];
  const headerTenant =
    typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
      ? headerTenantId.trim()
      : undefined;
  return requestTenantId || sessionTenantId || headerTenant || null;
}

function requireTenantId(request: any, reply: any): string | null {
  const tenantId = resolveTenantId(request);
  if (tenantId) return tenantId;
  reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
  return null;
}

function auditWrite(
  action: Parameters<typeof audit>[0],
  outcome: 'success' | 'failure',
  actor: string,
  dfn: string,
  detail: { mode: string; rpc?: string; draftId?: string; docIen?: string }
) {
  audit(
    action,
    outcome,
    { duz: actor },
    {
      patientDfn: dfn,
      detail: {
        mode: detail.mode,
        rpc: detail.rpc,
        draftId: detail.draftId,
        docIen: detail.docIen,
      },
    }
  );
}

function sanitizeVistaSignText(value: string): string {
  return String(value || '')
    .replace(/[\x00-\x1f\x7f]+/g, ' ')
    .replace(/^\d+(?:\[[^\]]+\])?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNoteSignFailure(rawValue: string): {
  status: 'sign-blocked' | 'sign-failed';
  blocker?: string;
  message: string;
} {
  const raw = String(rawValue || '').trim();
  const sanitized = sanitizeVistaSignText(raw);
  const matchText = sanitized || raw;

  if (/incorrect electronic signature code|electronic signature code.*try again/i.test(matchText)) {
    return {
      status: 'sign-blocked',
      blocker: 'invalid_esCode',
      message: 'Incorrect electronic signature code. Try again.',
    };
  }

  if (/electronic signature/i.test(matchText) && /not/i.test(matchText)) {
    return {
      status: 'sign-blocked',
      blocker: 'esCode_unavailable',
      message: 'Electronic signature is not available for this user in the current VistA context.',
    };
  }

  if (/locked/i.test(matchText)) {
    return {
      status: 'sign-blocked',
      blocker: 'document_locked',
      message: 'This note is locked by another user or process. Refresh and try again.',
    };
  }

  return {
    status: 'sign-failed',
    message: sanitized || 'TIU SIGN RECORD failed. Retry or contact support if the problem persists.',
  };
}

/* ------------------------------------------------------------------ */
/* FileMan date parser                                                 */
/* ------------------------------------------------------------------ */

function parseFileManDate(fmDate: string): string {
  if (!fmDate || fmDate.length < 7) return fmDate;
  const [datePart, timePart] = fmDate.split('.');
  const y = parseInt(datePart.substring(0, 3), 10) + 1700;
  const m = datePart.substring(3, 5);
  const d = datePart.substring(5, 7);
  let date = `${y}-${m}-${d}`;
  if (timePart && timePart.length >= 4) {
    date += ` ${timePart.substring(0, 2)}:${timePart.substring(2, 4)}`;
  }
  return date;
}

/* ------------------------------------------------------------------ */
/* Route plugin                                                        */
/* ------------------------------------------------------------------ */

export default async function tiuNotesRoutes(server: FastifyInstance): Promise<void> {
  /* ------------------------------------------------------------------ */
  /* Phase 154: Register DB-backed idempotency middleware for POST routes */
  /* ------------------------------------------------------------------ */
  const idempotencyPreHandler = idempotencyGuard();
  server.addHook('onRequest', async (request, reply) => {
    if (request.method === 'POST') {
      await idempotencyPreHandler(request, reply);
    }
  });
  server.addHook('onSend', idempotencyOnSend);

  /* ================================================================
   * GET /vista/cprs/notes
   * RPC: TIU DOCUMENTS BY CONTEXT (signed + unsigned, merged, deduped)
   * ================================================================ */
  server.get('/vista/cprs/notes', async (request) => {
    const dfn = (request.query as any)?.dfn;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: 'Missing or non-numeric dfn' };

    const rpcUsed = ['TIU DOCUMENTS BY CONTEXT'];
    const vivianPresence = { 'TIU DOCUMENTS BY CONTEXT': 'present' as const };
    const check = optionalRpc('TIU DOCUMENTS BY CONTEXT');
    const actor = getActor(request);

    if (!check.available) {
      return {
        ok: false,
        status: 'integration-pending',
        rpcUsed,
        vivianPresence,
        message: 'TIU DOCUMENTS BY CONTEXT is not available in this environment.',
      };
    }

    try {
      validateCredentials();
      await connect();

      // Fetch signed notes (CONTEXT=1) and unsigned notes (CONTEXT=2)
      // Params: CLASS, CONTEXT, DFN, EARLY, LATE, PERSON, OCCLIM, SEQUENCE
      const signedLines = await safeCallRpc(
        'TIU DOCUMENTS BY CONTEXT',
        [
          '3', // CLASS - progress notes
          '1', // CONTEXT - all signed
          String(dfn), // DFN
          '', // EARLY - no start filter
          '', // LATE - no end filter
          '0', // PERSON - all authors
          '0', // OCCLIM - no limit
          'D', // SEQUENCE - descending (newest first)
        ],
        { idempotent: true }
      );

      const unsignedLines = await safeCallRpc(
        'TIU DOCUMENTS BY CONTEXT',
        [
          '3', // CLASS - progress notes
          '2', // CONTEXT - unsigned
          String(dfn), // DFN
          '', // EARLY
          '', // LATE
          '0', // PERSON - all authors
          '0', // OCCLIM
          'D', // SEQUENCE
        ],
        { idempotent: true }
      );

      disconnect();

      // Merge lines, dedup by IEN (unsigned first so newest show at top)
      const seenIens = new Set<string>();
      const allLines: string[] = [];
      for (const line of [...unsignedLines, ...signedLines]) {
        const ien = line.split('^')[0]?.trim();
        if (ien && /^\d+$/.test(ien) && !seenIens.has(ien)) {
          seenIens.add(ien);
          allLines.push(line);
        }
      }

      // Parse results
      // Wire format per line:
      // IEN^title^editDate(FM)^patient^authorDUZ;sigName;authorName^location^status^visitDate^...
      const results = allLines
        .map((line) => {
          const parts = line.split('^');
          if (parts.length < 7) return null;
          const id = parts[0].trim();
          if (!id || !/^\d+$/.test(id)) return null;
          const title = (parts[1] || '').replace(/^\+\s*/, '').trim();
          const fmDate = parts[2] || '';
          const authorField = parts[4] || '';
          const location = parts[5] || '';
          const status = parts[6] || '';
          const date = parseFileManDate(fmDate);
          const authorParts = authorField.split(';');
          const author = authorParts.length >= 3 ? authorParts[2] : authorParts[1] || authorField;
          return { id, title, date, author, location, status };
        })
        .filter(Boolean);

      audit(
        'phi.notes-view',
        'success',
        { duz: actor },
        {
          patientDfn: String(dfn),
          detail: { count: results.length, source: 'cprs' },
        }
      );

      return {
        ok: true,
        count: results.length,
        results,
        rpcUsed,
        vivianPresence,
        source: 'cprs',
      };
    } catch (err: any) {
      disconnect();
      return { ok: false, error: safeErr(err), rpcUsed, vivianPresence };
    }
  });

  /* ================================================================
   * GET /vista/cprs/notes/text
   * RPC: TIU GET RECORD TEXT
   * ================================================================ */
  server.get('/vista/cprs/notes/text', async (request) => {
    const ien = (request.query as any)?.ien;
    if (!ien || !/^\d+$/.test(String(ien)))
      return { ok: false, error: 'Missing or non-numeric ien query parameter' };

    const rpcUsed = ['TIU GET RECORD TEXT'];
    const vivianPresence = { 'TIU GET RECORD TEXT': 'present' as const };
    const check = optionalRpc('TIU GET RECORD TEXT');
    const actor = getActor(request);

    if (!check.available) {
      return {
        ok: false,
        status: 'integration-pending',
        rpcUsed,
        vivianPresence,
        message: 'TIU GET RECORD TEXT is not available in this environment.',
      };
    }

    try {
      validateCredentials();
      await connect();
      const lines = await safeCallRpc('TIU GET RECORD TEXT', [String(ien)], { idempotent: true });
      disconnect();

      const text = lines.join('\n');

      audit(
        'clinical.note-view-text',
        'success',
        { duz: actor },
        {
          detail: { docIen: String(ien) },
        }
      );

      return { ok: true, ien: String(ien), text, rpcUsed, vivianPresence };
    } catch (err: any) {
      disconnect();
      return { ok: false, error: safeErr(err), rpcUsed, vivianPresence };
    }
  });

  /* ================================================================
   * POST /vista/cprs/notes/create
   * RPC: TIU CREATE RECORD + TIU SET DOCUMENT TEXT
   * Already exists in wave2-routes.ts — this route is NOT re-registered.
   * Wave 2 create is authoritative. Documented here for completeness.
   * ================================================================ */
  // NOTE: wave2-routes.ts already registers POST /vista/cprs/notes/create
  // with full safety model (idempotency, optionalRpc, draft fallback).
  // Phase 60 does NOT duplicate it. The UI calls the wave2 endpoint.

  /* ================================================================
   * POST /vista/cprs/notes/sign
   * RPC: TIU LOCK RECORD -> TIU SIGN RECORD -> TIU UNLOCK RECORD
   * ================================================================ */
  server.post('/vista/cprs/notes/sign', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    const { dfn, docIen, esCode } = body;
    const rpcUsed = ['TIU LOCK RECORD', 'TIU SIGN RECORD', 'TIU UNLOCK RECORD'];
    const vivianPresence = {
      'TIU LOCK RECORD': 'present' as const,
      'TIU SIGN RECORD': 'present' as const,
      'TIU UNLOCK RECORD': 'present' as const,
    };

    const errors = validateRequired(body, ['dfn', 'docIen']);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: 'dfn', message: 'dfn must be numeric' });
    if (docIen && !/^\d+$/.test(String(docIen)))
      errors.push({ field: 'docIen', message: 'docIen must be numeric' });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const actor = getActor(request);

    /* Phase 154: esCode required for real signing — structured blocker, not 400 */
    if (!esCode) {
      auditWrite('clinical.note-sign', 'failure', actor, validDfn!, { mode: 'blocked-no-esCode' });
      return {
        ok: false,
        status: 'sign-blocked',
        blocker: 'esCode_required',
        rpcUsed,
        vivianPresence,
        message: 'Electronic signature code (esCode) is required to sign TIU notes.',
      };
    }

    const checkLock = optionalRpc('TIU LOCK RECORD');
    const checkSign = optionalRpc('TIU SIGN RECORD');

    if (checkLock.available && checkSign.available) {
      try {
        validateCredentials();
        await connect();

        // Step 1: Lock the document
        const lockResp = await safeCallRpc('TIU LOCK RECORD', [String(docIen)], {
          idempotent: false,
        });
        const lockOk = lockResp[0]?.trim() === '1' || lockResp[0]?.trim() === '';

        if (!lockOk && lockResp[0]?.trim() !== '0') {
          // Lock failed but not a hard denial — may be already locked
          log.warn('TIU LOCK RECORD returned unexpected value', { resp: lockResp[0] });
        }

        try {
          // Step 2: Sign the document
          const signResp = await safeCallRpc('TIU SIGN RECORD', [String(docIen), String(esCode)], {
            idempotent: false,
          });

          // TIU SIGN RECORD returns empty string on success, error text on failure
          const signResult = signResp.join('\n').trim();
          if (signResult && signResult !== '0') {
            const normalizedFailure = normalizeNoteSignFailure(signResult);
            // Non-empty response indicates an error
            disconnect();
            // Always unlock
            try {
              await connect();
              await safeCallRpc('TIU UNLOCK RECORD', [String(docIen)], { idempotent: false });
              disconnect();
            } catch {
              disconnect();
            }

            return {
              ok: false,
              status: normalizedFailure.status,
              blocker: normalizedFailure.blocker,
              message: normalizedFailure.message,
              error: normalizedFailure.message,
              rpcUsed,
              vivianPresence,
            };
          }

          // Step 3: Unlock
          await safeCallRpc('TIU UNLOCK RECORD', [String(docIen)], { idempotent: false });
          disconnect();

          const result = {
            ok: true,
            mode: 'real',
            status: 'signed',
            documentIen: String(docIen),
            rpcUsed,
            vivianPresence,
          };
          auditWrite('clinical.note-sign', 'success', actor, validDfn!, {
            mode: 'real',
            rpc: 'TIU SIGN RECORD',
            docIen: String(docIen),
          });
          return result;
        } catch (signErr: any) {
          // Always unlock even on error
          try {
            await safeCallRpc('TIU UNLOCK RECORD', [String(docIen)], { idempotent: false });
          } catch {
            /* unlock best-effort */
          }
          disconnect();
          log.warn('TIU SIGN RECORD failed', { error: signErr.message });
          throw signErr;
        }
      } catch (err: any) {
        disconnect();
        log.warn('TIU note sign flow failed, falling back to draft', { error: safeErr(err) });
      }
    }

    // Draft fallback
    const draft = createDraft('order-sign', validDfn!, 'TIU SIGN RECORD', {
      action: 'note-sign',
      docIen: String(docIen),
      attemptedAt: new Date().toISOString(),
    }, tenantId);
    auditWrite('clinical.note-sign', 'success', actor, validDfn!, {
      mode: 'draft',
      draftId: draft.id,
    });
    const result = {
      ok: true,
      mode: 'draft',
      draftId: draft.id,
      status: 'sign-pending',
      syncPending: true,
      rpcUsed,
      vivianPresence,
      message: 'Note sign saved as server-side draft. TIU SIGN RECORD sync pending.',
    };
    return result;
  });

  /* ================================================================
   * POST /vista/cprs/notes/addendum
   * RPC: TIU CREATE ADDENDUM RECORD + TIU SET DOCUMENT TEXT
   * ================================================================ */
  server.post('/vista/cprs/notes/addendum', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    const { dfn, parentDocIen, noteText } = body;
    const rpcUsed = [
      'TIU CREATE ADDENDUM RECORD',
      'TIU SET DOCUMENT TEXT',
      'TIU DETAILED DISPLAY',
      'TIU GET RECORD TEXT',
    ];
    const vivianPresence = {
      'TIU CREATE ADDENDUM RECORD': 'present' as const,
      'TIU SET DOCUMENT TEXT': 'present' as const,
      'TIU DETAILED DISPLAY': 'present' as const,
      'TIU GET RECORD TEXT': 'present' as const,
    };

    const errors = validateRequired(body, ['dfn', 'parentDocIen', 'noteText']);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: 'dfn', message: 'dfn must be numeric' });
    if (parentDocIen && !/^\d+$/.test(String(parentDocIen)))
      errors.push({ field: 'parentDocIen', message: 'parentDocIen must be numeric' });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const checkCreate = optionalRpc('TIU CREATE ADDENDUM RECORD');
    const checkText = optionalRpc('TIU SET DOCUMENT TEXT');
    const actor = getActor(request);

    if (checkCreate.available && checkText.available) {
      try {
        validateCredentials();
        await connect();
        const duz = getDuz();

        // Step 1: Create the addendum (params: parent IEN, DUZ)
        const createResp = await safeCallRpc(
          'TIU CREATE ADDENDUM RECORD',
          [String(parentDocIen), duz],
          { idempotent: false }
        );

        const addendumIen = createResp[0]?.split('^')[0]?.trim();
        if (!addendumIen || addendumIen === '0' || addendumIen.startsWith('-1')) {
          disconnect();
          throw new Error(`TIU CREATE ADDENDUM RECORD returned error: ${createResp.join(' ')}`);
        }

        const textResp = await safeCallRpcWithList(
          'TIU SET DOCUMENT TEXT',
          [
            { type: 'literal', value: addendumIen },
            { type: 'list', value: buildTiuTextBuffer(noteText) },
            { type: 'literal', value: '0' },
          ],
          { idempotent: false }
        );

        const textAck = textResp[0]?.trim() || '';
        if (textAck.startsWith('0^')) {
          disconnect();
          return {
            ok: false,
            status: 'addendum-blocked',
            blocker: 'note_text_write_failed',
            message:
              textAck.split('^').slice(3).join('^') ||
              'VistA rejected the addendum body text for this TIU note.',
            addendumIen,
            parentDocIen: String(parentDocIen),
            rpcUsed,
            vivianPresence,
          };
        }

        const detailLines = await safeCallRpc('TIU DETAILED DISPLAY', [addendumIen], {
          idempotent: true,
        });
        const readbackLines = await safeCallRpc('TIU GET RECORD TEXT', [addendumIen], {
          idempotent: true,
        });
        const lineCount = parseTiuLineCount(detailLines);
        const hasPersistedBody =
          lineCount > 0 ||
          tiuReadbackContainsExpectedText(readbackLines, noteText) ||
          tiuReadbackContainsExpectedText(detailLines, noteText);
        if (!hasPersistedBody) {
          disconnect();
          auditWrite('clinical.note-addendum', 'failure', actor, validDfn!, {
            mode: 'blocked-text-not-persisted',
            rpc: 'TIU SET DOCUMENT TEXT',
            docIen: addendumIen,
          });
          return {
            ok: false,
            status: 'addendum-blocked',
            blocker: 'note_text_not_persisted',
            message:
              'VistA created an addendum shell but did not persist the addendum body text in this environment. Addendum creation is blocked to avoid false success.',
            addendumIen,
            parentDocIen: String(parentDocIen),
            rpcUsed,
            vivianPresence,
          };
        }

        disconnect();

        const result = {
          ok: true,
          mode: 'real',
          status: 'addendum-created',
          addendumIen,
          parentDocIen: String(parentDocIen),
          rpcUsed,
          vivianPresence,
        };
        auditWrite('clinical.note-addendum', 'success', actor, validDfn!, {
          mode: 'real',
          rpc: 'TIU CREATE ADDENDUM RECORD',
          docIen: addendumIen,
        });
        return result;
      } catch (err: any) {
        disconnect();
        log.warn('TIU addendum creation failed, falling back to draft', { error: safeErr(err) });
      }
    }

    // Draft fallback
    const draft = createDraft('order-sign', validDfn!, 'TIU CREATE ADDENDUM RECORD', {
      action: 'note-addendum',
      parentDocIen: String(parentDocIen),
      attemptedAt: new Date().toISOString(),
    }, tenantId);
    auditWrite('clinical.note-addendum', 'success', actor, validDfn!, {
      mode: 'draft',
      draftId: draft.id,
    });
    const result = {
      ok: true,
      mode: 'draft',
      draftId: draft.id,
      status: 'addendum-pending',
      syncPending: true,
      rpcUsed,
      vivianPresence,
      message: 'Addendum saved as server-side draft. TIU CREATE ADDENDUM RECORD sync pending.',
    };
    return result;
  });

  /* ================================================================
   * GET /vista/cprs/notes/titles
   * RPC: TIU PERSONAL TITLE LIST
   * ================================================================ */
  server.get('/vista/cprs/notes/titles', async (request) => {
    const rpcUsed = ['TIU PERSONAL TITLE LIST'];
    const vivianPresence = { 'TIU PERSONAL TITLE LIST': 'present' as const };
    const check = optionalRpc('TIU PERSONAL TITLE LIST');

    if (!check.available) {
      return {
        ok: false,
        status: 'integration-pending',
        rpcUsed,
        vivianPresence,
        message: 'TIU PERSONAL TITLE LIST is not available in this environment.',
        defaultTitles: [{ ien: '10', name: 'GENERAL NOTE' }],
      };
    }

    try {
      validateCredentials();
      await connect();
      const duz = getDuz();

      // TIU PERSONAL TITLE LIST params: DUZ
      const lines = await safeCallRpc('TIU PERSONAL TITLE LIST', [duz], { idempotent: true });
      disconnect();

      // Response format: each line is IEN^TITLE NAME. Ignore raw M error output
      // and other non-title lines so the UI gets either valid titles or a clean fallback.
      const titles = lines
        .filter((l) => /^\d+\^[^^]+/.test(l.trim()))
        .map((l) => {
          const parts = l.split('^');
          return { ien: parts[0]?.trim(), name: (parts[1] || '').trim() };
        })
        .filter((t) => t.ien && t.name);

      // If the personal list is empty or VistA returned only unusable rows,
      // provide the known-safe default title instead of surfacing garbage.
      if (titles.length === 0) {
        const hadRuntimeError = lines.some(
          (line) =>
            /M\s+ERROR|%YDB-E-|LVUNDEF|LAST REF=|TIUSRVD/i.test(line) || line.startsWith('-1')
        );
        return {
          ok: true,
          titles: [{ ien: '10', name: 'GENERAL NOTE' }],
          rpcUsed,
          vivianPresence,
          note: hadRuntimeError
            ? 'VistA returned no usable personal titles. Using default.'
            : 'No personal titles configured. Using default.',
        };
      }

      return { ok: true, titles, rpcUsed, vivianPresence };
    } catch (err: any) {
      disconnect();
      return {
        ok: false,
        error: safeErr(err),
        rpcUsed,
        vivianPresence,
        defaultTitles: [{ ien: '10', name: 'GENERAL NOTE' }],
      };
    }
  });

  log.info('Phase 60: TIU notes routes registered (list, text, sign, addendum, titles)');
}
