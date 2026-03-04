/**
 * Switchboard REST routes
 * Phase 533 (Wave 39 P3)
 */

import type { FastifyInstance } from 'fastify';
import { getAllWorkflows, getWorkflow, getRecentEvents } from './switchboard.js';

export async function switchboardRoutes(server: FastifyInstance): Promise<void> {
  /** List all registered workflows */
  server.get('/workflow/switchboard', async (_request, _reply) => {
    return getAllWorkflows();
  });

  /** Get single workflow detail + Mermaid diagram */
  server.get<{ Params: { name: string } }>(
    '/workflow/switchboard/:name',
    async (request, reply) => {
      const { name } = request.params;
      const reg = getWorkflow(name);
      if (!reg) {
        return reply.code(404).send({ error: `Workflow "${name}" not found` });
      }
      return {
        ...reg.fsm.toJSON(),
        description: reg.description,
        domain: reg.domain,
        phase: reg.phase,
        mermaid: reg.fsm.toMermaid(),
      };
    }
  );

  /** Recent transition events (admin) */
  server.get('/workflow/switchboard/events', async (request, _reply) => {
    const query = (request.query as Record<string, string>) || {};
    const workflow = query.workflow || undefined;
    const limit = Math.min(parseInt(query.limit || '100', 10), 1000);
    return { events: getRecentEvents({ workflow, limit }) };
  });
}
