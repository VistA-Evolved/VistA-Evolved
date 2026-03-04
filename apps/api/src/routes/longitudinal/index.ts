/**
 * Longitudinal Viewer Routes -- Phase 540: JLV-style Longitudinal Viewer v1
 *
 * Aggregates existing VistA clinical data endpoints into a unified,
 * chronological timeline suitable for JLV-style cross-domain viewing.
 *
 * Endpoints:
 *   GET /vista/longitudinal/timeline?dfn=N      -- chronological event stream
 *   GET /vista/longitudinal/summary?dfn=N       -- domain-level summary counts
 *   GET /vista/longitudinal/meds-summary?dfn=N  -- medication-focused longitudinal view
 *
 * All data sourced from existing VistA RPCs (no new RPCs needed).
 * Auth: session-based (default AUTH_RULES catch-all).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../../auth/auth-routes.js';
import { log } from '../../lib/logger.js';
import { safeCallRpc } from '../../lib/rpc-resilience.js';

/** Unified timeline event across all clinical domains */
interface TimelineEvent {
  id: string;
  domain: string;
  date: string;
  summary: string;
  detail?: string;
  ien?: string;
  severity?: string;
}

/** Parse a VistA date string (FM format or ISO) into sortable ISO string */
function parseFmDate(raw: string): string {
  if (!raw) return '';
  // FM format: YYYMMDD.HHMMSS (3-digit year = year - 1700)
  const match = raw.match(/^(\d{3})(\d{2})(\d{2})\.?(\d{0,6})$/);
  if (match) {
    const year = parseInt(match[1], 10) + 1700;
    const month = match[2];
    const day = match[3];
    return `${year}-${month}-${day}`;
  }
  // Try ISO-ish
  if (raw.includes('-') || raw.includes('/')) return raw.slice(0, 10);
  return raw;
}

/** Fetch allergies domain */
async function fetchAllergies(dfn: string): Promise<TimelineEvent[]> {
  try {
    const lines = await safeCallRpc('ORQQAL LIST', [dfn]);
    return lines
      .filter((l: string) => l.trim())
      .map((line: string) => {
        const parts = line.split('^');
        return {
          id: `allergy-${parts[0]?.trim() || '?'}`,
          domain: 'allergy',
          date: '',
          summary: parts[1]?.trim() || 'Unknown allergen',
          severity: parts[2]?.trim() || '',
          ien: parts[0]?.trim(),
        };
      });
  } catch {
    return [];
  }
}

/** Fetch problems domain */
async function fetchProblems(dfn: string): Promise<TimelineEvent[]> {
  try {
    const lines = await safeCallRpc('ORQQPL PROBLEM LIST', [dfn, 'A']);
    return lines
      .filter((l: string) => l.trim())
      .map((line: string) => {
        const parts = line.split('^');
        return {
          id: `problem-${parts[0]?.trim() || '?'}`,
          domain: 'problem',
          date: parseFmDate(parts[3]?.trim() || ''),
          summary: parts[1]?.trim() || 'Unknown problem',
          detail: parts[2]?.trim() || '',
          ien: parts[0]?.trim(),
        };
      });
  } catch {
    return [];
  }
}

/** Fetch vitals domain */
async function fetchVitals(dfn: string): Promise<TimelineEvent[]> {
  try {
    const lines = await safeCallRpc('ORQQVI VITALS', [dfn]);
    return lines
      .filter((l: string) => l.trim())
      .map((line: string) => {
        const parts = line.split('^');
        return {
          id: `vital-${parts[0]?.trim() || Math.random().toString(36).slice(2)}`,
          domain: 'vital',
          date: parseFmDate(parts[1]?.trim() || ''),
          summary: `${parts[2]?.trim() || '?'}: ${parts[3]?.trim() || '?'}`,
          ien: parts[0]?.trim(),
        };
      });
  } catch {
    return [];
  }
}

/** Fetch notes domain */
async function fetchNotes(dfn: string): Promise<TimelineEvent[]> {
  try {
    const lines = await safeCallRpc('TIU DOCUMENTS BY CONTEXT', [
      '',
      dfn,
      '3',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
    return lines
      .filter((l: string) => l.trim() && !l.startsWith('^'))
      .map((line: string) => {
        const parts = line.split('^');
        return {
          id: `note-${parts[0]?.trim() || '?'}`,
          domain: 'note',
          date: parseFmDate(parts[3]?.trim() || ''),
          summary: parts[1]?.trim() || 'Note',
          detail: parts[5]?.trim() || '',
          ien: parts[0]?.trim(),
        };
      });
  } catch {
    return [];
  }
}

/** Fetch medications domain */
async function fetchMedications(dfn: string): Promise<TimelineEvent[]> {
  try {
    const lines = await safeCallRpc('ORWPS ACTIVE', [dfn]);
    const events: TimelineEvent[] = [];
    let current: string[] = [];
    for (const line of lines) {
      if (line.startsWith('~')) {
        if (current.length > 0) {
          const header = current[0].replace('~', '');
          const parts = header.split('^');
          events.push({
            id: `med-${parts[0]?.trim() || '?'}`,
            domain: 'medication',
            date: parseFmDate(parts[6]?.trim() || ''),
            summary: parts[1]?.trim() || 'Medication',
            detail: parts[4]?.trim() || '',
            ien: parts[0]?.trim(),
          });
        }
        current = [line];
      } else {
        current.push(line);
      }
    }
    if (current.length > 0) {
      const header = current[0].replace('~', '');
      const parts = header.split('^');
      events.push({
        id: `med-${parts[0]?.trim() || 'last'}`,
        domain: 'medication',
        date: parseFmDate(parts[6]?.trim() || ''),
        summary: parts[1]?.trim() || 'Medication',
        detail: parts[4]?.trim() || '',
        ien: parts[0]?.trim(),
      });
    }
    return events;
  } catch {
    return [];
  }
}

/** Fetch labs domain */
async function fetchLabs(dfn: string): Promise<TimelineEvent[]> {
  try {
    const lines = await safeCallRpc('ORWLRR INTERIM', [dfn, '', '']);
    return lines
      .filter((l: string) => l.trim())
      .slice(0, 50)
      .map((line: string, i: number) => {
        const parts = line.split('^');
        return {
          id: `lab-${i}-${parts[0]?.trim() || '?'}`,
          domain: 'lab',
          date: parseFmDate(parts[1]?.trim() || ''),
          summary: parts[0]?.trim() || 'Lab result',
          detail: parts[2]?.trim() || '',
        };
      });
  } catch {
    return [];
  }
}

/** Fetch consults domain */
async function fetchConsults(dfn: string): Promise<TimelineEvent[]> {
  try {
    const lines = await safeCallRpc('ORQQCN LIST', [dfn, '', '', '', '']);
    return lines
      .filter((l: string) => l.trim())
      .map((line: string) => {
        const parts = line.split('^');
        return {
          id: `consult-${parts[0]?.trim() || '?'}`,
          domain: 'consult',
          date: parseFmDate(parts[2]?.trim() || ''),
          summary: parts[1]?.trim() || 'Consult',
          detail: parts[3]?.trim() || '',
          ien: parts[0]?.trim(),
        };
      });
  } catch {
    return [];
  }
}

/** Fetch surgery domain */
async function fetchSurgery(dfn: string): Promise<TimelineEvent[]> {
  try {
    const lines = await safeCallRpc('ORWSR LIST', [dfn]);
    return lines
      .filter((l: string) => l.trim())
      .map((line: string) => {
        const parts = line.split('^');
        return {
          id: `surgery-${parts[0]?.trim() || '?'}`,
          domain: 'surgery',
          date: parseFmDate(parts[2]?.trim() || ''),
          summary: parts[1]?.trim() || 'Surgical case',
          ien: parts[0]?.trim(),
        };
      });
  } catch {
    return [];
  }
}

export default async function longitudinalRoutes(server: FastifyInstance) {
  /* ---- GET /vista/longitudinal/timeline ---- */
  server.get(
    '/vista/longitudinal/timeline',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const { dfn } = request.query as { dfn?: string };
      if (!dfn) return reply.code(400).send({ ok: false, error: 'dfn query param required' });

      try {
        // Fetch all domains in parallel
        const [allergies, problems, vitals, notes, meds, labs, consults, surgery] =
          await Promise.all([
            fetchAllergies(dfn),
            fetchProblems(dfn),
            fetchVitals(dfn),
            fetchNotes(dfn),
            fetchMedications(dfn),
            fetchLabs(dfn),
            fetchConsults(dfn),
            fetchSurgery(dfn),
          ]);

        const allEvents = [
          ...allergies,
          ...problems,
          ...vitals,
          ...notes,
          ...meds,
          ...labs,
          ...consults,
          ...surgery,
        ];

        // Sort by date descending (most recent first), undated items last
        allEvents.sort((a, b) => {
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return b.date.localeCompare(a.date);
        });

        return {
          ok: true,
          dfn,
          eventCount: allEvents.length,
          domains: {
            allergies: allergies.length,
            problems: problems.length,
            vitals: vitals.length,
            notes: notes.length,
            medications: meds.length,
            labs: labs.length,
            consults: consults.length,
            surgery: surgery.length,
          },
          events: allEvents,
          rpcsUsed: [
            'ORQQAL LIST',
            'ORQQPL PROBLEM LIST',
            'ORQQVI VITALS',
            'TIU DOCUMENTS BY CONTEXT',
            'ORWPS ACTIVE',
            'ORWLRR INTERIM',
            'ORQQCN LIST',
            'ORWSR LIST',
          ],
          generatedAt: new Date().toISOString(),
        };
      } catch (err: any) {
        log.warn('GET /vista/longitudinal/timeline failed', { error: err.message });
        return reply.code(500).send({ ok: false, error: 'Failed to build longitudinal timeline' });
      }
    }
  );

  /* ---- GET /vista/longitudinal/summary ---- */
  server.get(
    '/vista/longitudinal/summary',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const { dfn } = request.query as { dfn?: string };
      if (!dfn) return reply.code(400).send({ ok: false, error: 'dfn query param required' });

      try {
        const [allergies, problems, vitals, notes, meds, labs, consults, surgery] =
          await Promise.all([
            fetchAllergies(dfn),
            fetchProblems(dfn),
            fetchVitals(dfn),
            fetchNotes(dfn),
            fetchMedications(dfn),
            fetchLabs(dfn),
            fetchConsults(dfn),
            fetchSurgery(dfn),
          ]);

        return {
          ok: true,
          dfn,
          summary: [
            { domain: 'allergies', count: allergies.length, rpc: 'ORQQAL LIST' },
            { domain: 'problems', count: problems.length, rpc: 'ORQQPL PROBLEM LIST' },
            { domain: 'vitals', count: vitals.length, rpc: 'ORQQVI VITALS' },
            { domain: 'notes', count: notes.length, rpc: 'TIU DOCUMENTS BY CONTEXT' },
            { domain: 'medications', count: meds.length, rpc: 'ORWPS ACTIVE' },
            { domain: 'labs', count: labs.length, rpc: 'ORWLRR INTERIM' },
            { domain: 'consults', count: consults.length, rpc: 'ORQQCN LIST' },
            { domain: 'surgery', count: surgery.length, rpc: 'ORWSR LIST' },
          ],
          totalEvents:
            allergies.length +
            problems.length +
            vitals.length +
            notes.length +
            meds.length +
            labs.length +
            consults.length +
            surgery.length,
          generatedAt: new Date().toISOString(),
        };
      } catch (err: any) {
        log.warn('GET /vista/longitudinal/summary failed', { error: err.message });
        return reply.code(500).send({ ok: false, error: 'Failed to build longitudinal summary' });
      }
    }
  );

  /* ---- GET /vista/longitudinal/meds-summary ---- */
  server.get(
    '/vista/longitudinal/meds-summary',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!requireSession(request, reply)) return;
      const { dfn } = request.query as { dfn?: string };
      if (!dfn) return reply.code(400).send({ ok: false, error: 'dfn query param required' });

      try {
        const meds = await fetchMedications(dfn);
        // Group by active/historical heuristic (presence of detail/status info)
        const active = meds.filter((m) => m.detail?.toLowerCase()?.includes('active') || !m.detail);
        const historical = meds.filter(
          (m) =>
            m.detail?.toLowerCase()?.includes('expired') ||
            m.detail?.toLowerCase()?.includes('discontinued')
        );
        const other = meds.filter((m) => !active.includes(m) && !historical.includes(m));

        return {
          ok: true,
          dfn,
          totalMedications: meds.length,
          active: { count: active.length, items: active },
          historical: { count: historical.length, items: historical },
          other: { count: other.length, items: other },
          rpcUsed: 'ORWPS ACTIVE',
          generatedAt: new Date().toISOString(),
        };
      } catch (err: any) {
        log.warn('GET /vista/longitudinal/meds-summary failed', { error: err.message });
        return reply.code(500).send({ ok: false, error: 'Failed to build medication summary' });
      }
    }
  );

  log.info('Longitudinal viewer routes registered (Phase 540: 3 endpoints, 8-domain aggregation)');
}
