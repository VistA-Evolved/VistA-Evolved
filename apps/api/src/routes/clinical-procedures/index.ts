/**
 * Clinical Procedures Routes -- Phase 537 + Phase 581 + Phase 613
 *
 * Endpoints:
 *   GET  /vista/clinical-procedures?dfn=N                     -- TIU Clinical Procedures notes, or consult fallback when TIU CP is empty
 *   GET  /vista/clinical-procedures/:id?kind=tiu|consult      -- Detail for a CP note or consult-backed record
 *   GET  /vista/clinical-procedures/medicine?dfn=N            -- Medicine (MD) package grounding / pending
 *   GET  /vista/clinical-procedures/consult-link?dfn=N&consultId=ID -- Read-only consult linkage candidates + detail
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../../auth/auth-routes.js';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { log } from '../../lib/logger.js';
import { safeErr } from '../../lib/safe-error.js';

interface CpListItem {
  id: string;
  entryType: 'tiu-clinproc' | 'consult';
  procedureName: string;
  status: string;
  datePerformed: string;
  provider: string;
  location?: string;
  service?: string;
}

function parseMdResults(lines: string[]): Array<{ id: string; name: string; date: string; status: string }> {
  const results: Array<{ id: string; name: string; date: string; status: string }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split('^');
    const id = (parts[0] || '').trim();
    if (!id) continue;
    results.push({
      id,
      name: (parts[1] || '').trim() || `Procedure ${id}`,
      date: formatVistaDateTime(parts[2] || ''),
      status: (parts[3] || '').trim() || 'completed',
    });
  }
  return results;
}

function formatVistaDateTime(value: string): string {
  const input = (value || '').trim();
  if (!input || input.includes('-') || input.length < 7) return input;
  const [datePart, timePart] = input.split('.');
  if (datePart.length < 7) return input;
  const year = parseInt(datePart.substring(0, 3), 10) + 1700;
  const month = datePart.substring(3, 5);
  const day = datePart.substring(5, 7);
  let output = `${year}-${month}-${day}`;
  if (timePart && timePart.length >= 4) output += ` ${timePart.substring(0, 2)}:${timePart.substring(2, 4)}`;
  return output;
}

function parseTiuDocuments(lines: string[]): CpListItem[] {
  const seen = new Set<string>();
  const results: CpListItem[] = [];
  for (const line of lines) {
    const parts = line.split('^');
    if (parts.length < 7) continue;
    const id = (parts[0] || '').trim();
    if (!/^\d+$/.test(id) || seen.has(id)) continue;
    seen.add(id);
    const title = (parts[1] || '').replace(/^\+\s*/, '').trim();
    const fmDate = (parts[2] || '').trim();
    const authorField = (parts[4] || '').trim();
    const location = (parts[5] || '').trim() || undefined;
    const status = (parts[6] || '').trim();
    const authorParts = authorField.split(';');
    const provider = authorParts.length >= 3 ? authorParts[2] : authorParts[1] || authorField;
    results.push({
      id,
      entryType: 'tiu-clinproc',
      procedureName: title || `Clinical Procedure ${id}`,
      status,
      datePerformed: formatVistaDateTime(fmDate),
      provider,
      location,
    });
  }
  return results;
}

function parseConsults(lines: string[]): CpListItem[] {
  const results: CpListItem[] = [];
  for (const line of lines) {
    const parts = line.split('^');
    if (parts.length < 9) continue;
    const id = (parts[0] || '').trim();
    if (!/^\d+$/.test(id)) continue;
    const date = formatVistaDateTime(parts[1] || '');
    const status = (parts[5] || '').trim();
    const service = (parts[6] || '').trim();
    const typeCode = (parts[8] || '').trim();
    results.push({
      id,
      entryType: 'consult',
      procedureName: service || `Consult ${id}`,
      status,
      datePerformed: date,
      provider: '',
      service,
      location: typeCode || undefined,
    });
  }
  return results;
}

function firstNumericValue(lines: string[]): string | undefined {
  for (const line of lines) {
    const value = String(line || '').trim();
    if (/^\d+$/.test(value)) return value;
  }
  return undefined;
}

function hasMeaningfulText(lines: string[]): boolean {
  return lines.some((line) => {
    const value = String(line || '').trim();
    return value.length > 0 && !value.startsWith('-1^');
  });
}

export default async function clinicalProceduresRoutes(server: FastifyInstance) {
  log.info('Clinical Procedures routes registered (Phase 537)');

  server.get('/vista/clinical-procedures', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const dfn = String((request.query as any)?.dfn || '').trim();
    if (!/^\d+$/.test(dfn)) {
      return reply.code(400).send({ ok: false, error: 'Missing or invalid dfn query parameter' });
    }

    const rpcUsed: string[] = [];
    let classIen: string | undefined;

    try {
      const classLines = await safeCallRpc('TIU IDENTIFY CLINPROC CLASS', []);
      rpcUsed.push('TIU IDENTIFY CLINPROC CLASS');
      classIen = firstNumericValue(classLines);

      if (classIen) {
        const signedLines = await safeCallRpc('TIU DOCUMENTS BY CONTEXT', [classIen, '1', dfn, '', '', '0', '0', 'D']);
        const unsignedLines = await safeCallRpc('TIU DOCUMENTS BY CONTEXT', [classIen, '2', dfn, '', '', '0', '0', 'D']);
        rpcUsed.push('TIU DOCUMENTS BY CONTEXT');
        const tiuResults = parseTiuDocuments([...unsignedLines, ...signedLines]);
        if (tiuResults.length > 0) {
          return {
            ok: true,
            source: 'vista-tiu-clinproc',
            classIen,
            count: tiuResults.length,
            results: tiuResults,
            note: 'Showing TIU Clinical Procedures class documents for this patient.',
            rpcUsed,
          };
        }
      }
    } catch (err) {
      log.warn('Clinical Procedures TIU probe failed; falling back to consult-side reads', {
        err: String(err),
        dfn,
      });
    }

    try {
      const consultLines = await safeCallRpc('ORQQCN LIST', [dfn]);
      rpcUsed.push('ORQQCN LIST');
      const consultResults = parseConsults(consultLines);
      return {
        ok: true,
        source: 'vista-consults-fallback',
        classIen,
        count: consultResults.length,
        results: consultResults,
        note:
          consultResults.length > 0
            ? 'No TIU Clinical Procedures documents were found; showing consult-tracked procedure records available for this patient.'
            : 'No TIU Clinical Procedures documents or consult-tracked procedure records were found for this patient.',
        rpcUsed,
      };
    } catch (err: any) {
      log.warn('Clinical Procedures consult fallback failed', { err: String(err), dfn });
      return reply.code(502).send({
        ok: false,
        error: safeErr(err),
        rpcUsed,
      });
    }
  });

  server.get('/vista/clinical-procedures/medicine', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const dfn = String((request.query as any)?.dfn || '').trim();
    if (!/^\d+$/.test(dfn)) {
      return reply.code(400).send({ ok: false, error: 'Missing or invalid dfn query parameter' });
    }

    const rpcUsed: string[] = [];

    // Try MD TMDPATIENT for patient medicine results
    try {
      const mdLines = await safeCallRpc('MD TMDPATIENT', [dfn]);
      rpcUsed.push('MD TMDPATIENT');
      const results = parseMdResults(mdLines);

      return {
        ok: true,
        source: 'vista',
        count: results.length,
        results,
        rpcUsed,
        note: results.length === 0
          ? 'MD TMDPATIENT returned no medicine results for this patient.'
          : undefined,
      };
    } catch (mdErr: any) {
      rpcUsed.push('MD TMDPATIENT');
      log.warn('MD TMDPATIENT failed, trying MD TMDWIDGET', { err: String(mdErr) });
    }

    // Fallback: try MD TMDWIDGET
    try {
      const widgetLines = await safeCallRpc('MD TMDWIDGET', [dfn]);
      rpcUsed.push('MD TMDWIDGET');
      const results = parseMdResults(widgetLines);

      return {
        ok: true,
        source: 'vista',
        count: results.length,
        results,
        rpcUsed,
        note: results.length === 0
          ? 'MD TMDWIDGET returned no medicine results for this patient.'
          : undefined,
      };
    } catch (widgetErr: any) {
      rpcUsed.push('MD TMDWIDGET');
      log.warn('MD TMDWIDGET also failed', { err: String(widgetErr) });
      return reply.code(502).send({
        ok: false,
        error: `Medicine RPCs failed: ${safeErr(widgetErr)}`,
        rpcUsed,
      });
    }
  });

  server.get('/vista/clinical-procedures/consult-link', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const dfn = String((request.query as any)?.dfn || '').trim();
    const consultId = String((request.query as any)?.consultId || '').trim();
    if (!/^\d+$/.test(dfn)) {
      return reply.code(400).send({ ok: false, error: 'Missing or invalid dfn query parameter' });
    }
    if (consultId && !/^\d+$/.test(consultId)) {
      return reply.code(400).send({ ok: false, error: 'consultId must be numeric when provided' });
    }

    const rpcUsed: string[] = [];
    try {
      const consultLines = await safeCallRpc('ORQQCN LIST', [dfn]);
      rpcUsed.push('ORQQCN LIST');
      const results = parseConsults(consultLines);
      let detailText = '';
      if (consultId) {
        const detailLines = await safeCallRpc('ORQQCN DETAIL', [consultId]);
        rpcUsed.push('ORQQCN DETAIL');
        detailText = detailLines.join('\n');
      }
      return {
        ok: true,
        source: 'vista',
        count: results.length,
        results,
        selectedConsultId: consultId || undefined,
        detailText,
        rpcUsed,
        vistaGrounding: {
          vistaFiles: ['File 123 (Request/Consultation)', 'File 702 (Clinical Procedures)'],
          targetRoutines: ['ORQQCN3', 'MDRPCOD'],
          targetRpcs: [
            'ORQQCN ASSIGNABLE MED RESULTS',
            'ORQQCN ATTACH MED RESULTS',
            'ORQQCN REMOVABLE MED RESULTS',
            'ORQQCN GET MED RESULT DETAILS',
          ],
          migrationPath:
            'Read-only consult candidates are live. The remaining step is wiring assignable medicine results and attach/detach writes when MD package data is available.',
          sandboxNote:
            'Consult reads are live now. Consult-to-medicine attach/detach remains pending until the MD package exposes assignable results in the sandbox.',
        },
      };
    } catch (err: any) {
      log.warn('Clinical Procedures consult-link route failed', { err: String(err), dfn, consultId });
      return reply.code(502).send({ ok: false, error: safeErr(err), rpcUsed });
    }
  });

  server.get('/vista/clinical-procedures/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const id = String((request.params as any)?.id || '').trim();
    const kind = String((request.query as any)?.kind || '').trim().toLowerCase();
    if (!/^\d+$/.test(id)) {
      return reply.code(400).send({ ok: false, error: 'Missing or invalid clinical procedure id' });
    }

    const detailOrder =
      kind === 'consult' ? ['consult'] : kind === 'tiu' || kind === 'tiu-clinproc' ? ['tiu'] : ['tiu', 'consult'];

    const rpcUsed: string[] = [];
    for (const detailKind of detailOrder) {
      try {
        if (detailKind === 'tiu') {
          const textLines = await safeCallRpc('TIU GET RECORD TEXT', [id]);
          if (!hasMeaningfulText(textLines)) continue;
          rpcUsed.push('TIU GET RECORD TEXT');
          let detail = '';
          try {
            const detailLines = await safeCallRpc('TIU DETAILED DISPLAY', [id]);
            if (hasMeaningfulText(detailLines)) {
              detail = detailLines.join('\n');
              rpcUsed.push('TIU DETAILED DISPLAY');
            }
          } catch {
            // Leave detail empty if TIU detail is unavailable for this document.
          }
          return {
            ok: true,
            source: 'vista',
            entryType: 'tiu-clinproc',
            id,
            text: textLines.join('\n'),
            detail,
            rpcUsed,
          };
        }

        const consultLines = await safeCallRpc('ORQQCN DETAIL', [id]);
        if (!hasMeaningfulText(consultLines)) continue;
        rpcUsed.push('ORQQCN DETAIL');
        return {
          ok: true,
          source: 'vista',
          entryType: 'consult',
          id,
          text: consultLines.join('\n'),
          detail: '',
          rpcUsed,
        };
      } catch {
        // Try the next compatible read path.
      }
    }

    return reply.code(404).send({
      ok: false,
      error: 'No Clinical Procedures detail could be resolved for this id.',
      rpcUsed,
    });
  });
}
