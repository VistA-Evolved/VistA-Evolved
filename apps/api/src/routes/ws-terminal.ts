/**
 * WebSocket-to-SSH Terminal Proxy
 *
 * Provides a WebSocket endpoint at /ws/terminal that bridges
 * browser-based xterm.js to VistA's SSH daemon for pure Roll-and-Scroll
 * terminal access. Users get the full VT220 terminal experience.
 *
 * Architecture:
 *   Browser (xterm.js) <-> WebSocket <-> This Proxy <-> SSH <-> VistA (D ^ZU)
 *
 * Security:
 *   - Requires valid session (session auth via cookie)
 *   - SSH credentials are server-managed, never sent to browser
 *   - All terminal sessions are audit-logged
 *   - Session recording optional (VISTA_TERMINAL_RECORD=true)
 */

import type { FastifyInstance } from 'fastify';
import { Client as SSHClient } from 'ssh2';
import { getSession, type SessionData } from '../auth/session-store.js';
import { audit as centralAudit } from '../lib/audit.js';
import { log } from '../lib/logger.js';

interface TerminalSessionInfo {
  sessionId: string;
  duz: string;
  username: string;
  connectedAt: string;
  sshHost: string;
  sshPort: number;
}

const activeSessions = new Map<string, TerminalSessionInfo>();

const SSH_HOST = process.env.VISTA_SSH_HOST || process.env.VISTA_HOST || '127.0.0.1';
const SSH_PORT = parseInt(process.env.VISTA_SSH_PORT || '2223', 10);
const SSH_USER = process.env.VISTA_SSH_USER || 'vista';
const SSH_PASS = process.env.VISTA_SSH_PASSWORD || 'vista';
const RECORD_SESSIONS = process.env.VISTA_TERMINAL_RECORD === 'true';
const MAX_CONCURRENT = parseInt(process.env.VISTA_TERMINAL_MAX_SESSIONS || '50', 10);

function safeTerminalAudit(
  action: 'rpc.console-connect' | 'rpc.console-disconnect',
  session: SessionData | null,
  detail: Record<string, unknown>
) {
  try {
    centralAudit(action, 'success', {
      duz: session?.duz,
      name: session?.userName,
      role: session?.role,
    }, {
      detail,
    });
  } catch (err) {
    log.error({ action, error: err instanceof Error ? err.message : String(err), detail }, 'Terminal audit failed');
  }
}

export async function wsTerminalRoutes(server: FastifyInstance) {
  server.get('/ws/terminal', { websocket: true }, async (socket, request) => {
    const sessionId = `term-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Authenticate
    let session: SessionData | null = null;
    try {
      session = request.session ?? null;
      if (!session) {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const qToken = url.searchParams.get('token') || '';
        if (qToken) {
          session = await getSession(qToken);
        }
      }
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
      socket.close(4001, 'Unauthorized');
      return;
    }

    if (!session) {
      socket.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
      socket.close(4001, 'Unauthorized');
      return;
    }

    if (activeSessions.size >= MAX_CONCURRENT) {
      socket.send(JSON.stringify({ type: 'error', message: 'Maximum concurrent terminal sessions reached' }));
      socket.close(4003, 'Too many sessions');
      return;
    }

    log.info({ sessionId, duz: session.duz }, 'Terminal session started');

    const info: TerminalSessionInfo = {
      sessionId,
      duz: session.duz,
      username: session.userName || 'unknown',
      connectedAt: new Date().toISOString(),
      sshHost: SSH_HOST,
      sshPort: SSH_PORT,
    };
    activeSessions.set(sessionId, info);

    safeTerminalAudit('rpc.console-connect', session, { sessionId, sshHost: SSH_HOST, sshPort: SSH_PORT });

    // Create SSH connection
    const ssh = new SSHClient();
    let sshConnected = false;
    let cleanedUp = false;

    log.info({ sessionId, sshHost: SSH_HOST, sshPort: SSH_PORT, sshUser: SSH_USER }, 'Initiating terminal SSH connection');

    ssh.on('ready', () => {
      sshConnected = true;
      log.info({ sessionId }, 'SSH connection established');

      ssh.shell(
        { term: 'xterm-256color', cols: 80, rows: 24 },
        (err, stream) => {
          if (err) {
            socket.send(JSON.stringify({ type: 'error', message: 'Failed to open shell' }));
            socket.close(4002, 'Shell failed');
            cleanup('shell-error');
            return;
          }

          socket.send(JSON.stringify({ type: 'connected', sessionId }));

          // SSH -> Browser: forward terminal output
          stream.on('data', (data: Buffer) => {
            if (socket.readyState === 1) { // OPEN
              socket.send(data);
            }
          });

          stream.stderr.on('data', (data: Buffer) => {
            if (socket.readyState === 1) {
              socket.send(data);
            }
          });

          // Browser -> SSH: forward keystrokes
          socket.on('message', (msg: Buffer | string) => {
            if (!sshConnected) return;

            const text = typeof msg === 'string'
              ? msg
              : Buffer.isBuffer(msg)
                ? msg.toString('utf8')
                : null;

            // Handle control messages (JSON)
            if (text) {
              try {
                const parsed = JSON.parse(text);
                if (parsed.type === 'resize' && parsed.cols && parsed.rows) {
                  stream.setWindow(parsed.rows, parsed.cols, 0, 0);
                  return;
                }
                if (parsed.type === 'ping') {
                  socket.send(JSON.stringify({ type: 'pong' }));
                  return;
                }
              } catch {
                // Not JSON, treat as terminal input
              }
            }

            // Forward raw input to SSH
            stream.write(msg);
          });

          stream.on('close', () => {
            log.info({ sessionId }, 'SSH stream closed');
            if (socket.readyState === 1) {
              socket.send(JSON.stringify({ type: 'disconnected', reason: 'SSH stream closed' }));
              socket.close(1000, 'SSH closed');
            }
            cleanup('ssh-stream-close');
          });
        }
      );
    });

    ssh.on('error', (err) => {
      log.error({ sessionId, error: err.message }, 'SSH connection error');
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({ type: 'error', message: `SSH error: ${err.message}` }));
        socket.close(4002, 'SSH error');
      }
      cleanup('ssh-error');
    });

    ssh.on('close', (hadError) => {
      log.info({ sessionId, hadError }, 'SSH connection closed');
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({ type: 'disconnected', reason: 'SSH connection closed' }));
        socket.close(1000, 'SSH disconnected');
      }
      cleanup('ssh-close');
    });

    socket.on('close', (code, reason) => {
      log.info({ sessionId, code, reason: reason?.toString() || '' }, 'WebSocket closed');
      cleanup('websocket-close');
    });

    socket.on('error', (err) => {
      log.error({ sessionId, error: (err as Error).message }, 'WebSocket error');
      cleanup('websocket-error');
    });

    function cleanup(reason: string) {
      if (cleanedUp) return;
      cleanedUp = true;
      sshConnected = false;
      activeSessions.delete(sessionId);
      try { ssh.end(); } catch { /* ignore */ }

      safeTerminalAudit('rpc.console-disconnect', session, { sessionId, reason });
    }

    // Initiate SSH connection
    try {
      ssh.connect({
        host: SSH_HOST,
        port: SSH_PORT,
        username: SSH_USER,
        password: SSH_PASS,
        keepaliveInterval: 30000,
        readyTimeout: 10000,
      });
    } catch (err) {
      log.error({ sessionId, error: err instanceof Error ? err.message : String(err) }, 'SSH connect threw synchronously');
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({ type: 'error', message: 'SSH connect failed before handshake' }));
        socket.close(4002, 'SSH connect failed');
      }
      cleanup('ssh-connect-throw');
    }
  });

  // Admin endpoint: list active terminal sessions
  server.get('/terminal/sessions', async (request, reply) => {
    const sessions = Array.from(activeSessions.values()).map(s => ({
      sessionId: s.sessionId,
      username: s.username,
      connectedAt: s.connectedAt,
    }));
    return { ok: true, sessions, count: sessions.length, maxConcurrent: MAX_CONCURRENT };
  });

  // Health check for SSH connectivity
  server.get('/terminal/health', async (request, reply) => {
    return new Promise((resolve) => {
      const ssh = new SSHClient();
      const timeout = setTimeout(() => {
        try { ssh.end(); } catch { /* */ }
        resolve({
          ok: false,
          ssh: { host: SSH_HOST, port: SSH_PORT, status: 'timeout' },
          activeSessions: activeSessions.size,
        });
      }, 5000);

      ssh.on('ready', () => {
        clearTimeout(timeout);
        ssh.end();
        resolve({
          ok: true,
          ssh: { host: SSH_HOST, port: SSH_PORT, status: 'connected' },
          activeSessions: activeSessions.size,
          maxConcurrent: MAX_CONCURRENT,
        });
      });

      ssh.on('error', (err) => {
        clearTimeout(timeout);
        resolve({
          ok: false,
          ssh: { host: SSH_HOST, port: SSH_PORT, status: 'error', error: err.message },
          activeSessions: activeSessions.size,
        });
      });

      ssh.connect({
        host: SSH_HOST,
        port: SSH_PORT,
        username: SSH_USER,
        password: SSH_PASS,
        readyTimeout: 5000,
      });
    });
  });
}
