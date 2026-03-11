import type { FastifyInstance } from 'fastify';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const DOCS_ROOT = join(process.cwd(), '..', '..', 'docs', 'modules');

interface HelpQuery {
  moduleId?: string;
  query?: string;
}

export default async function vistaHelpRoutes(server: FastifyInstance) {
  server.get('/vista/help/modules', async () => {
    const { VISTA_PANEL_REGISTRY } = await import('../../../apps/web/src/lib/vista-panel-registry.js').catch(() => ({ VISTA_PANEL_REGISTRY: [] }));
    return {
      ok: true,
      totalModules: 76,
      tiers: [
        { tier: 1, count: 15, label: 'Core Clinical' },
        { tier: 2, count: 22, label: 'Hospital Operations' },
        { tier: 3, count: 18, label: 'Administrative' },
        { tier: 4, count: 20, label: 'Infrastructure/Interop' },
        { tier: 5, count: 1, label: 'Specialized' },
      ],
    };
  });

  server.get('/vista/help/module/:id', async (request) => {
    const { id } = request.params as { id: string };
    const readmePath = join(DOCS_ROOT, id.toLowerCase(), 'README.md');

    if (!existsSync(readmePath)) {
      return { ok: false, error: `Module ${id} documentation not found` };
    }

    const content = readFileSync(readmePath, 'utf-8');
    return { ok: true, moduleId: id, documentation: content };
  });

  server.get('/vista/help/rpc-coverage', async () => {
    const coveragePath = join(process.cwd(), '..', '..', 'docs', 'vista-alignment', 'rpc-coverage.json');
    if (!existsSync(coveragePath)) {
      return { ok: false, error: 'RPC coverage data not found' };
    }
    const raw = readFileSync(coveragePath, 'utf-8');
    const bom = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    return { ok: true, coverage: JSON.parse(bom) };
  });

  server.get('/vista/help/gap-assessment', async () => {
    const gapPath = join(process.cwd(), '..', '..', 'docs', 'vista-alignment', 'gap-assessment.md');
    if (!existsSync(gapPath)) {
      return { ok: false, error: 'Gap assessment not found' };
    }
    const content = readFileSync(gapPath, 'utf-8');
    return { ok: true, assessment: content };
  });

  server.get('/vista/help/search', async (request) => {
    const { q } = request.query as { q?: string };
    if (!q) return { ok: false, error: 'Query parameter q is required' };

    const query = q.toLowerCase();
    const results: Array<{ moduleId: string; section: string; text: string }> = [];

    const { readdirSync } = await import('fs');
    const dirs = readdirSync(DOCS_ROOT, { withFileTypes: true }).filter(d => d.isDirectory());

    for (const dir of dirs) {
      const readmePath = join(DOCS_ROOT, dir.name, 'README.md');
      if (!existsSync(readmePath)) continue;
      const content = readFileSync(readmePath, 'utf-8');
      if (content.toLowerCase().includes(query)) {
        const lines = content.split('\n');
        const matchLine = lines.find(l => l.toLowerCase().includes(query));
        results.push({
          moduleId: dir.name,
          section: lines.find(l => l.startsWith('#'))?.replace(/^#+\s*/, '') || dir.name,
          text: matchLine?.trim() || '',
        });
      }
      if (results.length >= 20) break;
    }

    return { ok: true, query: q, results };
  });
}
