/**
 * RPC Connection Pool -- Phase 573 (Wave 42)
 *
 * Replaces the single global socket in rpcBrokerClient.ts with a pool of
 * connections keyed by `tenantId:duz`. Each connection authenticates as a
 * specific VistA user, ensuring clinical actions are attributed to the
 * correct provider (DUZ-per-request).
 *
 * Architecture:
 *   Pool key = `${tenantId}:${duz}`
 *   Each PooledConnection has its own socket, readBuf, and per-connection mutex.
 *   Multiple connections for different users can run RPC calls in parallel.
 *   Service-level calls (no user context) use the system DUZ from env vars.
 *
 * See docs/security/single-duz-problem.md for the full design rationale.
 */

import { createConnection, Socket } from 'net';
import { log } from '../lib/logger.js';
import { RPC_CONFIG } from '../config/server-config.js';
import { recordRpcTrace } from '../qa/rpc-trace.js';
import { getRequestId } from '../lib/logger.js';

const EOT = '\x04';
const PREFIX = '[XWB]';

const MAX_CONNECTIONS_PER_USER = Number(process.env.VISTA_MAX_CONNECTIONS_PER_USER || 3);
const MAX_POOL_TOTAL = Number(process.env.VISTA_MAX_POOL_TOTAL || 50);
const IDLE_TIMEOUT_MS = Number(process.env.VISTA_IDLE_TIMEOUT_MS || 300_000);
const CONNECT_TIMEOUT_MS = RPC_CONFIG.connectTimeoutMs;

function dbg(step: string, detail?: string): void {
  if (process.env.VISTA_DEBUG !== 'true') return;
  const safe = detail ? detail.replace(/[\x00-\x03\x05-\x09\x0b\x0c\x0e-\x1f]/g, '.') : '';
  log.debug(`[RPC-POOL] ${step}`, { detail: safe || undefined });
}

/* ------------------------------------------------------------------ */
/* XWB protocol helpers (duplicated from rpcBrokerClient to avoid      */
/* circular dependency -- these are pure functions)                     */
/* ------------------------------------------------------------------ */

function sPack(s: string): string {
  if (s.length > 255) throw new Error('sPack: string exceeds 255');
  return String.fromCharCode(s.length) + s;
}

function lPack(s: string): string {
  return s.length.toString().padStart(3, '0') + s;
}

function buildTCPConnect(clientIP: string, callbackPort: number): string {
  return (
    PREFIX +
    '10304' +
    sPack('TCPConnect') +
    '5' +
    '0' +
    lPack(clientIP) +
    'f' +
    '0' +
    lPack(String(callbackPort)) +
    'f' +
    EOT
  );
}

function buildRpcMessage(rpcName: string, params: string[] = []): string {
  let msg = PREFIX + '11302' + '\x01' + '1' + sPack(rpcName);
  if (params.length === 0) {
    msg += '54f';
  } else {
    msg += '5';
    for (const p of params) {
      msg += '0' + lPack(p) + 'f';
    }
  }
  return msg + EOT;
}

export type RpcParam =
  | { type: 'literal'; value: string }
  | { type: 'list'; value: Record<string, string> };

function encodeListKeyForMumps(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return '""';
  if (trimmed.startsWith('"')) return trimmed;
  if (/^\d+(,\d+)*$/.test(trimmed)) return trimmed;
  const commaIndex = trimmed.indexOf(',');
  if (commaIndex === -1) return '"' + trimmed + '"';
  const head = trimmed.slice(0, commaIndex).trim();
  const tail = trimmed.slice(commaIndex);
  if (!head) return trimmed;
  return '"' + head + '"' + tail;
}

function buildRpcMessageEx(rpcName: string, params: RpcParam[]): string {
  let msg = PREFIX + '11302' + '\x01' + '1' + sPack(rpcName);
  if (params.length === 0) {
    msg += '54f';
  } else {
    msg += '5';
    for (const p of params) {
      if (p.type === 'literal') {
        msg += '0' + lPack(p.value) + 'f';
      } else {
        const entries = Object.entries(p.value);
        msg += '2';
        entries.forEach(([key, val], idx) => {
          const quotedKey = encodeListKeyForMumps(key);
          msg += lPack(quotedKey) + lPack(val);
          msg += idx < entries.length - 1 ? 't' : 'f';
        });
      }
    }
  }
  return msg + EOT;
}

function buildBye(): string {
  return PREFIX + '10304' + sPack('#BYE#') + EOT;
}

const CIPHER_PAD: readonly string[] = [
  'wkEo-ZJt!dG)49K{nX1BS$vH<&:Myf*>Ae0jQW=;|#PsO`\'%+rmb[gpqN,l6/hFC@DcUa ]z~R}"V\\iIxu?872.(TYL5_3',
  'rKv`R;M/9BqAF%&tSs#Vh)dO1DZP> *fX\'u[.4lY=-mg_ci802N7LTG<]!CWo:3?{+,5Q}(@jaExn$~p\\IyHwzU"|k6Jeb',
  '\\pV(ZJk"WQmCn!Y,y@1d+~8s?[lNMxgHEt=uw|X:qSLjAI*}6zoF{T3#;ca)/h5%`P4$r]G\'9e2if_>UDKb7<v0&- RBO.',
  'depjt3g4W)qD0V~NJar\\B "?OYhcu[<Ms%Z`RIL_6:]AX-zG.#}$@vk7/5x&*m;(yb2Fn+l\'PwUof1K{9,|EQi>H=CT8S!',
  'NZW:1}K$byP;jk)7\'`x90B|cq@iSsEnu,(l-hf.&Y_?J#R]+voQXU8mrV[!p4tg~OMez CAaGFD6H53%L/dT2<*>"{\\wI=',
  'vCiJ<oZ9|phXVNn)m K`t/SI%]A5qOWe\\&?;jT~M!fz1l>[D_0xR32c*4.P"G{r7}E8wUgyudF+6-:B=$(sY,LkbHa#\'@Q',
  'hvMX,\'4Ty;[a8/{6l~F_V"}qLI\\!@x(D7bRmUH]W15J%N0BYPkrs&9:$)Zj>u|zwQ=ieC-oGA.#?tfdcO3gp`S+En K2*<',
  'jd!W5[];4\'<C$/&x|rZ(k{>?ghBzIFN}fAK"#`p_TqtD*1E37XGVs@0nmSe+Y6Qyo-aUu%i8c=H2vJ\\) R:MLb.9,wlO~P',
  '2ThtjEM+!=xXb)7,ZV{*ci3"8@_l-HS69L>]\\AUF/Q%:qD?1~m(yvO0e\'<#o$p4dnIzKP|`NrkaGg.ufCRB[; sJYwW}5&',
  'vB\\5/zl-9y:Pj|=(R\'7QJI *&CTX"p0]_3.idcuOefVU#omwNZ`$Fs?L+1Sk<,b)hM4A6[Y%aDrg@~KqEW8t>H};n!2xG{',
  'sFz0Bo@_HfnK>LR}qWXV+D6`Y28=4Cm~G/7-5A\\b9!a#rP.l&M$hc3ijQk;),TvUd<[:I"u1\'NZSOw]*gxtE{eJp|y (?%',
  'M@,D}|LJyGO8`$*ZqH .j>c~h<d=fimszv[#-53F!+a;NC\'6T91IV?(0x&/{B)w"]Q\\YUWprk4:ol%g2nE7teRKbAPuS_X',
  '.mjY#_0*H<B=Q+FML6]s;r2:e8R}[ic&KA 1w{)vV5d,$u"~xD/Pg?IyfthO@CzWp%!`N4Z\'3-(o|J9XUE7k\\TlqSb>anG',
  'xVa1\']_GU<X`|\\NgM?LS9{"jT%s$}y[nvtlefB2RKJW~(/cIDCPow4,>#zm+:5b@06O3Ap8=*7ZFY!H-uEQk; .q)i&rhd',
  'I]Jz7AG@QX."%3Lq>METUo{Pp_ |a6<0dYVSv8:b)~W9NK`(r\'4fs&wim\\kReC2hg=HOj$1B*/nxt,;c#y+![?lFuZ-5D}',
  'Rr(Ge6F Hx>q$m&C%M~Tn,:"o\'tX/*yP.{lZ!YkiVhuw_<KE5a[;}W0gjsz3]@7cI2\\QN?f#4p|vb1OUBD9)=-LJA+d`S8',
  'I~k>y|m};d)-7DZ"Fe/Y<B:xwojR,Vh]O0Sc[`$sg8GXE!1&Qrzp._W%TNK(=J 3i*2abuHA4C\'?Mv\\Pq{n#56LftUl@9+',
  '~A*>9 WidFN,1KsmwQ)GJM{I4:C%}#Ep(?HB/r;t.&U8o|l[\'Lg"2hRDyZ5`nbf]qjc0!zS-TkYO<_=76a\\X@$Pe3+xVvu',
  'yYgjf"5VdHc#uA,W1i+v\'6|@pr{n;DJ!8(btPGaQM.LT3oe?NB/&9>Z`-}02*%x<7lsqz4OS ~E$\\R]KI[:UwC_=h)kXmF',
  '5:iar.{YU7mBZR@-K|2 "+~`M%8sq4JhPo<_X\\Sg3WC;Tuxz,fvEQ1p9=w}FAI&j/keD0c?)LN6OHV]lGy\'$*>nd[(tb!#',
];

function cipherEncrypt(text: string): string {
  const assocIdx = Math.floor(Math.random() * 20) + 1;
  let idIdx = Math.floor(Math.random() * 20) + 1;
  if (idIdx === assocIdx) idIdx = (idIdx % 20) + 1;
  const assocStr = CIPHER_PAD[assocIdx - 1];
  const idStr = CIPHER_PAD[idIdx - 1];
  let s = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    const pos = idStr.indexOf(ch);
    s += pos === -1 ? ch : assocStr.charAt(pos);
  }
  return String.fromCharCode(idIdx + 31) + s + String.fromCharCode(assocIdx + 31);
}

function stripNulls(s: string): string {
  let i = 0;
  while (i < s.length && s.charCodeAt(i) === 0) i++;
  return i > 0 ? s.substring(i) : s;
}

/* ------------------------------------------------------------------ */
/* PooledConnection -- each has its own socket, buffer, and mutex       */
/* ------------------------------------------------------------------ */

interface PooledConnection {
  key: string;
  tenantId: string;
  duz: string;
  host: string;
  port: number;
  sock: Socket;
  readBuf: string;
  connected: boolean;
  lastActivityMs: number;
  mutexLocked: boolean;
  mutexQueue: Array<() => void>;
}

function acquireConnMutex(conn: PooledConnection): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!conn.mutexLocked) {
      conn.mutexLocked = true;
      resolve();
    } else {
      conn.mutexQueue.push(resolve);
    }
  });
}

function releaseConnMutex(conn: PooledConnection): void {
  const next = conn.mutexQueue.shift();
  if (next) {
    next();
  } else {
    conn.mutexLocked = false;
  }
}

async function withConnLock<T>(conn: PooledConnection, fn: () => Promise<T>): Promise<T> {
  await acquireConnMutex(conn);
  try {
    return await fn();
  } finally {
    releaseConnMutex(conn);
  }
}

function connRawSend(conn: PooledConnection, data: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!conn.sock || conn.sock.destroyed) return reject(new Error('Socket closed'));
    conn.sock.write(Buffer.from(data, 'latin1'), (err) => {
      if (err) return reject(new Error('Send: ' + err.message));
      conn.lastActivityMs = Date.now();
      resolve();
    });
  });
}

function sanitizeBufferPreview(raw: string): string {
  return raw.replace(/[\x00-\x1f]/g, ' ').trim().slice(0, 120);
}

function taintConnection(conn: PooledConnection): void {
  conn.connected = false;
  conn.readBuf = '';
  try {
    if (conn.sock && !conn.sock.destroyed) {
      conn.sock.destroy();
    }
  } catch {
    /* best effort */
  }
}

function connReadToEOT(conn: PooledConnection): Promise<string> {
  if (conn.readBuf.length > 0) {
    const existing = conn.readBuf.indexOf(EOT);
    if (existing !== -1) {
      const result = conn.readBuf.substring(0, existing);
      conn.readBuf = conn.readBuf.substring(existing + 1);
      conn.lastActivityMs = Date.now();
      return Promise.resolve(result);
    }

    const preview = sanitizeBufferPreview(conn.readBuf);
    taintConnection(conn);
    return Promise.reject(
      new Error(
        `Stale buffered RPC data detected before read${preview ? ` (${preview})` : ''}`
      )
    );
  }

  return new Promise((resolve, reject) => {
    if (!conn.sock || conn.sock.destroyed) return reject(new Error('Socket closed'));

    function onData(chunk: Buffer) {
      conn.readBuf += chunk.toString('latin1');
      const i = conn.readBuf.indexOf(EOT);
      if (i !== -1) {
        cleanup();
        const result = conn.readBuf.substring(0, i);
        conn.readBuf = conn.readBuf.substring(i + 1);
        conn.lastActivityMs = Date.now();
        resolve(result);
      }
    }

    function onErr(e: Error) {
      cleanup();
      taintConnection(conn);
      reject(new Error('Read: ' + e.message));
    }

    function onClose() {
      cleanup();
      const preview = sanitizeBufferPreview(conn.readBuf);
      taintConnection(conn);
      reject(
        new Error(
          preview
            ? `Connection closed before response terminator (${preview})`
            : 'Connection closed before response'
        )
      );
    }

    const timer = setTimeout(() => {
      cleanup();
      const preview = sanitizeBufferPreview(conn.readBuf);
      taintConnection(conn);
      reject(
        new Error(
          preview
            ? `Read timeout (${CONNECT_TIMEOUT_MS}ms) with partial buffered response (${preview})`
            : `Read timeout (${CONNECT_TIMEOUT_MS}ms)`
        )
      );
    }, CONNECT_TIMEOUT_MS);

    function cleanup() {
      clearTimeout(timer);
      conn.sock?.removeListener('data', onData);
      conn.sock?.removeListener('error', onErr);
      conn.sock?.removeListener('close', onClose);
    }

    conn.sock.on('data', onData);
    conn.sock.once('error', onErr);
    conn.sock.once('close', onClose);
  });
}

/* ------------------------------------------------------------------ */
/* Pool -- keyed by tenantId:duz                                        */
/* ------------------------------------------------------------------ */

const pool = new Map<string, PooledConnection>();
let idleReapTimer: ReturnType<typeof setInterval> | null = null;

function poolKey(tenantId: string, duz: string): string {
  return `${tenantId}:${duz}`;
}

/** Create a new TCP connection and authenticate as the given user. */
async function createPooledConnection(
  tenantId: string,
  duz: string,
  host: string,
  port: number,
  accessCode: string,
  verifyCode: string,
  context: string
): Promise<PooledConnection> {
  const key = poolKey(tenantId, duz);
  dbg('POOL CREATE', `key=${key} host=${host}:${port}`);

  const sock = await new Promise<Socket>((resolve, reject) => {
    const s = createConnection({ host, port });
    s.setKeepAlive(true, 30_000);
    const timer = setTimeout(() => {
      s.destroy();
      reject(new Error('TCP connect timeout'));
    }, CONNECT_TIMEOUT_MS);
    s.once('connect', () => {
      clearTimeout(timer);
      resolve(s);
    });
    s.once('error', (e) => {
      clearTimeout(timer);
      reject(new Error('TCP: ' + e.message));
    });
  });

  const conn: PooledConnection = {
    key,
    tenantId,
    duz,
    host,
    port,
    sock,
    readBuf: '',
    connected: false,
    lastActivityMs: Date.now(),
    mutexLocked: false,
    mutexQueue: [],
  };

  sock.once('close', () => {
    conn.connected = false;
    conn.readBuf = '';
  });
  sock.on('error', () => {
    conn.connected = false;
    conn.readBuf = '';
  });

  // TCPConnect handshake
  await connRawSend(conn, buildTCPConnect('127.0.0.1', 0));
  const tcpResp = stripNulls(await connReadToEOT(conn));
  if (!tcpResp.toLowerCase().includes('accept')) {
    sock.destroy();
    throw new Error('TCPConnect rejected: ' + tcpResp.replace(/[\x00-\x1f]/g, '.').trim());
  }

  // XUS SIGNON SETUP
  await connRawSend(conn, buildRpcMessage('XUS SIGNON SETUP'));
  await connReadToEOT(conn);

  // XUS AV CODE
  const avPlain = accessCode + ';' + verifyCode;
  const avEnc = cipherEncrypt(avPlain);
  await connRawSend(conn, buildRpcMessage('XUS AV CODE', [avEnc]));
  const avResp = stripNulls(await connReadToEOT(conn));
  const avLines = avResp.split(/\r?\n/);
  const authDuz = avLines[0]?.trim();
  if (!authDuz || authDuz === '0') {
    sock.destroy();
    const reason =
      avLines[3]?.trim() || avLines[2]?.trim() || avLines[1]?.trim() || 'Invalid credentials';
    throw new Error('Pool auth failed: ' + reason.replace(/[\x00-\x1f]/g, ' ').trim());
  }
  if (authDuz !== duz) {
    sock.destroy();
    throw new Error(
      `Pool DUZ mismatch: requested ${duz}, authenticated ${authDuz}. Refusing mislabeled clinician session.`
    );
  }

  // XWB CREATE CONTEXT
  const ctxEnc = cipherEncrypt(context);
  await connRawSend(conn, buildRpcMessage('XWB CREATE CONTEXT', [ctxEnc]));
  const ctxResp = stripNulls(await connReadToEOT(conn));
  if (ctxResp.split(/\r?\n/)[0]?.trim() !== '1') {
    sock.destroy();
    throw new Error('Pool set context failed: ' + ctxResp.replace(/[\x00-\x1f]/g, ' ').trim());
  }

  conn.connected = true;
  dbg('POOL READY', `key=${key} duz=${authDuz}`);
  return conn;
}

function destroyConnection(conn: PooledConnection): void {
  if (conn.sock && !conn.sock.destroyed) {
    try {
      conn.sock.write(Buffer.from(buildBye(), 'latin1'));
    } catch {
      /* best effort */
    }
    conn.sock.destroy();
  }
  conn.connected = false;
  conn.readBuf = '';
  pool.delete(conn.key);
}

function isConnHealthy(conn: PooledConnection): boolean {
  if (!conn.sock || conn.sock.destroyed || !conn.connected) return false;
  if (conn.lastActivityMs > 0 && Date.now() - conn.lastActivityMs > IDLE_TIMEOUT_MS) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export interface RpcContext {
  tenantId: string;
  duz: string;
  vistaHost: string;
  vistaPort: number;
  vistaContext?: string;
  accessCode?: string;
  verifyCode?: string;
}

export interface RpcPoolTestConnection {
  sock: Socket;
  readBuf: string;
  connected: boolean;
  lastActivityMs: number;
}

/**
 * Get or create a pooled connection for the given tenant+user.
 * Authenticates as the user's DUZ if creating a new connection.
 */
async function acquireConnection(ctx: RpcContext): Promise<PooledConnection> {
  const key = poolKey(ctx.tenantId, ctx.duz);
  let conn = pool.get(key);

  if (conn && isConnHealthy(conn)) {
    return conn;
  }

  if (conn) {
    destroyConnection(conn);
  }

  if (pool.size >= MAX_POOL_TOTAL) {
    let oldest: PooledConnection | null = null;
    for (const c of pool.values()) {
      if (!oldest || c.lastActivityMs < oldest.lastActivityMs) oldest = c;
    }
    if (oldest) {
      dbg('POOL EVICT', `key=${oldest.key} idle=${Date.now() - oldest.lastActivityMs}ms`);
      destroyConnection(oldest);
    }
  }

  if (!ctx.accessCode || !ctx.verifyCode) {
    throw new Error(
      `No active VistA credential binding for ${key}. Re-login or re-bind before running clinician-scoped RPCs.`
    );
  }

  conn = await createPooledConnection(
    ctx.tenantId,
    ctx.duz,
    ctx.vistaHost,
    ctx.vistaPort,
    ctx.accessCode,
    ctx.verifyCode,
    ctx.vistaContext || 'OR CPRS GUI CHART'
  );
  pool.set(key, conn);
  return conn;
}

/** Eagerly establish a pooled connection so login/bind fails fast if attribution is broken. */
export async function primeRpcContext(ctx: RpcContext): Promise<void> {
  await acquireConnection(ctx);
}

/**
 * Execute an RPC call through the pool with DUZ-per-request.
 * The connection is authenticated as the user specified in `ctx`.
 */
export async function poolCallRpc(
  rpcName: string,
  params: string[],
  ctx: RpcContext
): Promise<string[]> {
  const conn = await acquireConnection(ctx);
  return withConnLock(conn, async () => {
    if (!conn.connected || !conn.sock || conn.sock.destroyed) {
      throw new Error('Connection lost for ' + conn.key);
    }

    const rpcMsg = buildRpcMessage(rpcName, params);
    const start = Date.now();
    try {
      await connRawSend(conn, rpcMsg);
      const resp = stripNulls(await connReadToEOT(conn));
      const lines = resp.split(/\r?\n/).filter((l) => l.length > 0);
      recordRpcTrace({
        rpcName,
        params: [],
        durationMs: Date.now() - start,
        success: true,
        responseLines: lines.length,
        duz: ctx.duz,
        requestId: getRequestId(),
      });
      return lines;
    } catch (err: any) {
      recordRpcTrace({
        rpcName,
        params: [],
        durationMs: Date.now() - start,
        success: false,
        error: err.message?.slice(0, 200),
        responseLines: 0,
        duz: ctx.duz,
        requestId: getRequestId(),
      });
      taintConnection(conn);
      throw err;
    }
  });
}

/**
 * Execute a sequence of RPC reads atomically on one pooled connection.
 * Use this when multiple related RPCs must not interleave with other callers.
 */
export async function poolRunRpcSequence<T>(
  ctx: RpcContext,
  fn: (callLocked: (rpcName: string, params: string[]) => Promise<string[]>) => Promise<T>
): Promise<T> {
  const conn = await acquireConnection(ctx);
  return withConnLock(conn, async () => {
    const callLocked = async (rpcName: string, params: string[]): Promise<string[]> => {
      if (!conn.connected || !conn.sock || conn.sock.destroyed) {
        throw new Error('Connection lost for ' + conn.key);
      }

      const rpcMsg = buildRpcMessage(rpcName, params);
      const start = Date.now();
      try {
        await connRawSend(conn, rpcMsg);
        const resp = stripNulls(await connReadToEOT(conn));
        const lines = resp.split(/\r?\n/).filter((l) => l.length > 0);
        recordRpcTrace({
          rpcName,
          params: [],
          durationMs: Date.now() - start,
          success: true,
          responseLines: lines.length,
          duz: ctx.duz,
          requestId: getRequestId(),
        });
        return lines;
      } catch (err: any) {
        recordRpcTrace({
          rpcName,
          params: [],
          durationMs: Date.now() - start,
          success: false,
          error: err.message?.slice(0, 200),
          responseLines: 0,
          duz: ctx.duz,
          requestId: getRequestId(),
        });
        taintConnection(conn);
        throw err;
      }
    };

    return fn(callLocked);
  });
}

/**
 * Execute an RPC with mixed literal + list parameters through the pool.
 */
export async function poolCallRpcWithList(
  rpcName: string,
  params: RpcParam[],
  ctx: RpcContext
): Promise<string[]> {
  const conn = await acquireConnection(ctx);
  return withConnLock(conn, async () => {
    if (!conn.connected || !conn.sock || conn.sock.destroyed) {
      throw new Error('Connection lost for ' + conn.key);
    }

    const rpcMsg = buildRpcMessageEx(rpcName, params);
    const start = Date.now();
    try {
      await connRawSend(conn, rpcMsg);
      const resp = stripNulls(await connReadToEOT(conn));
      const lines = resp.split(/\r?\n/).filter((l) => l.length > 0);
      recordRpcTrace({
        rpcName,
        params: [],
        durationMs: Date.now() - start,
        success: true,
        responseLines: lines.length,
        duz: ctx.duz,
        requestId: getRequestId(),
      });
      return lines;
    } catch (err: any) {
      recordRpcTrace({
        rpcName,
        params: [],
        durationMs: Date.now() - start,
        success: false,
        error: err.message?.slice(0, 200),
        responseLines: 0,
        duz: ctx.duz,
        requestId: getRequestId(),
      });
      taintConnection(conn);
      throw err;
    }
  });
}

/** Get pool statistics for observability. */
export function getPoolStats(): {
  totalConnections: number;
  maxTotal: number;
  maxPerUser: number;
  connections: Array<{
    key: string;
    connected: boolean;
    idleMs: number;
  }>;
} {
  const connections: Array<{ key: string; connected: boolean; idleMs: number }> = [];
  for (const conn of pool.values()) {
    connections.push({
      key: conn.key,
      connected: conn.connected,
      idleMs: Date.now() - conn.lastActivityMs,
    });
  }
  return {
    totalConnections: pool.size,
    maxTotal: MAX_POOL_TOTAL,
    maxPerUser: MAX_CONNECTIONS_PER_USER,
    connections,
  };
}

/** Disconnect all pooled connections (graceful shutdown). */
export function disconnectPool(): void {
  dbg('POOL SHUTDOWN', `Closing ${pool.size} connections`);
  for (const conn of pool.values()) {
    destroyConnection(conn);
  }
  pool.clear();
  if (idleReapTimer) {
    clearInterval(idleReapTimer);
    idleReapTimer = null;
  }
}

/** Start the idle connection reaper. Called at server startup. */
export function startPoolReaper(): void {
  if (idleReapTimer) return;
  idleReapTimer = setInterval(() => {
    const now = Date.now();
    for (const conn of pool.values()) {
      if (now - conn.lastActivityMs > IDLE_TIMEOUT_MS) {
        dbg('POOL REAP', `key=${conn.key} idle=${now - conn.lastActivityMs}ms`);
        destroyConnection(conn);
      }
    }
  }, 60_000);
  idleReapTimer.unref();
}

export const __test__ = {
  readToEot(conn: RpcPoolTestConnection): Promise<string> {
    return connReadToEOT(conn as PooledConnection);
  },
};
