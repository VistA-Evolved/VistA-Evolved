import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { __test__, type RpcPoolTestConnection } from '../src/vista/rpcConnectionPool.js';

class MockSocket extends EventEmitter {
  destroyed = false;

  destroy(): this {
    this.destroyed = true;
    return this;
  }
}

function createConn(readBuf = ''): {
  conn: RpcPoolTestConnection;
  sock: MockSocket;
} {
  const sock = new MockSocket();
  return {
    sock,
    conn: {
      sock: sock as any,
      readBuf,
      connected: true,
      lastActivityMs: 0,
    },
  };
}

describe('rpcConnectionPool partial-read hardening', () => {
  it('returns a complete buffered response when EOT is already present', async () => {
    const { conn } = createConn('OK\x04tail');

    const result = await __test__.readToEot(conn);

    expect(result).toBe('OK');
    expect(conn.readBuf).toBe('tail');
    expect(conn.connected).toBe(true);
  });

  it('rejects stale unterminated bytes that were left in the pool buffer', async () => {
    const { conn, sock } = createConn('PARTIAL RESPONSE');

    await expect(__test__.readToEot(conn)).rejects.toThrow('Stale buffered RPC data detected');
    expect(conn.connected).toBe(false);
    expect(conn.readBuf).toBe('');
    expect(sock.destroyed).toBe(true);
  });

  it('rejects when the socket closes before the EOT terminator arrives', async () => {
    const { conn, sock } = createConn();

    const readPromise = __test__.readToEot(conn);
    sock.emit('data', Buffer.from('BROKEN', 'latin1'));
    sock.emit('close');

    await expect(readPromise).rejects.toThrow('Connection closed before response terminator');
    expect(conn.connected).toBe(false);
    expect(conn.readBuf).toBe('');
  });
});