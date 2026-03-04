/**
 * Server — Start
 *
 * Phase 173: Entry point that builds the server, starts listening,
 * and runs the full lifecycle (DB init, repo wiring, background jobs).
 */

import { buildServer } from './build-server.js';
import { runLifecycle } from './lifecycle.js';
import { log } from '../lib/logger.js';

export async function startServer(): Promise<void> {
  const port = Number(process.env.PORT || 3001);
  const host = process.env.HOST || '127.0.0.1';

  const server = await buildServer();

  try {
    await server.listen({ port, host });
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'EADDRINUSE') {
      log.fatal(`Port ${port} already in use. Kill the existing process or pick another port.`, {
        error: e.message,
        hint: 'See docs/runbooks/windows-port-3001-fix.md',
      });
    } else {
      log.fatal('Server failed to start', { error: e.message });
    }
    process.exit(1);
  }

  // Post-listen lifecycle: DB init, repo wiring, background services
  await runLifecycle({ host, port });
}
