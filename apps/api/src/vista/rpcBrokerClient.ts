import { createConnection, Socket } from 'net';
import {
  VISTA_HOST,
  VISTA_PORT,
  VISTA_ACCESS_CODE,
  VISTA_VERIFY_CODE,
  VISTA_CONTEXT,
  validateCredentials,
} from './config';
import { RPC_CONFIG } from '../config/server-config.js';
import { log, getRequestId } from '../lib/logger.js';
// Phase 96B: RPC trace recording at the protocol level
import { recordRpcTrace } from '../qa/rpc-trace.js';

/**
 * XWB RPC Broker client for VistA.
 *
 * Implements the standard XWB protocol used by CPRS and other VistA clients:
 *   TCPConnect -> XUS SIGNON SETUP -> XUS AV CODE -> XWB CREATE CONTEXT -> RPC
 *
 * Protocol references:
 *   - VistA RPC Broker Developer Guide (VA Technical Manual)
 *   - XWBTCPL.m, XWBBRK.m, XUSRB.m routines in VistA/MUMPS source
 *
 * Debug: set VISTA_DEBUG=true in environment to log protocol steps.
 *        Output goes through the structured logger (level=debug),
 *        not raw console.log. Credentials are NEVER logged.
 */

// ---- Constants ----------------------------------------------------------

/** Broker timeout wired to RPC_CONFIG.connectTimeoutMs (env: RPC_CONNECT_TIMEOUT_MS) */
const TIMEOUT_MS = RPC_CONFIG.connectTimeoutMs;
const EOT = '\x04'; // End-of-transmission marker used by XWB
const PREFIX = '[XWB]'; // Every client message starts with this

// ---- Debug logging (never logs credentials) -----------------------------
// Gated by VISTA_DEBUG env var AND routed through structured logger (level=debug)
// so production log-level filtering (default: "info") suppresses debug output
// even if VISTA_DEBUG=true is accidentally set.

function dbg(step: string, detail?: string): void {
  if (process.env.VISTA_DEBUG !== 'true') return;
  const safe = detail ? detail.replace(/[\x00-\x03\x05-\x09\x0b\x0c\x0e-\x1f]/g, '.') : '';
  log.debug(`[RPC-DEBUG] ${step}`, { detail: safe || undefined });
}

// ---- Async mutex for connection safety ----------------------------------
// Prevents concurrent requests from interleaving connect/callRpc/disconnect
// on the shared global socket. Callers must acquire the lock before any
// socket operation sequence.

let _mutexQueue: Array<() => void> = [];
let _mutexLocked = false;

function acquireMutex(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!_mutexLocked) {
      _mutexLocked = true;
      resolve();
    } else {
      _mutexQueue.push(resolve);
    }
  });
}

function releaseMutex(): void {
  const next = _mutexQueue.shift();
  if (next) {
    next(); // hand lock to next waiter
  } else {
    _mutexLocked = false;
  }
}

/**
 * Execute a function while holding the RPC broker mutex.
 * Ensures only one socket operation sequence runs at a time.
 */
export async function withBrokerLock<T>(fn: () => Promise<T>): Promise<T> {
  await acquireMutex();
  try {
    return await fn();
  } finally {
    releaseMutex();
  }
}

// ---- XWB framing helpers ------------------------------------------------

/** SPack: 1-byte length prefix (max 255 chars). */
function sPack(s: string): string {
  if (s.length > 255) throw new Error('sPack: string exceeds 255');
  return String.fromCharCode(s.length) + s;
}

/** LPack: 3-digit zero-padded length prefix. */
function lPack(s: string): string {
  return s.length.toString().padStart(3, '0') + s;
}

/**
 * Build %XWB TCPConnect handshake message.
 * Format: [XWB]10304 + SPack("TCPConnect") + params + EOT
 * Params: "5" + literal(ip) + literal(callbackPort)
 */
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

/**
 * Build a standard RPC call message.
 * Format: [XWB]11302 + SPack(rpcName) + paramSection + EOT
 * Each literal param: "0" + LPack(value) + "f"
 * No params: "54f"
 */
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

/** Build #BYE# disconnect message. */
function buildBye(): string {
  return PREFIX + '10304' + sPack('#BYE#') + EOT;
}

// ---- CipherPad encryption (XUS AV CODE + XWB CREATE CONTEXT) -----------
// These 20 cipher pads are extracted from the Z-tag of the XUSRB1.m routine
// shipped with every VistA distribution.  They are not user credentials, but
// they are security-sensitive implementation details of the RPC Broker sign-on
// obfuscation scheme.  Do not log or expose them unnecessarily.
// Algorithm matches ENCRYP^XUSRB1: random pair of pad indices (1-20),
// $TR substitution, identifier index (+31) at front, associator index (+31) at end.

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

/**
 * Encrypt text using VistA CipherPad (matches ENCRYP^XUSRB1).
 *
 * Algorithm:
 *   ASSOCIX = random 1-20, IDIX = random 1-20 (different from ASSOCIX)
 *   For each non-space char, find in IDSTR and replace with char at same pos in ASSOCSTR.
 *   Result: chr(IDIX+31) + translated + chr(ASSOCIX+31)
 */
function cipherEncrypt(text: string): string {
  const assocIdx = Math.floor(Math.random() * 20) + 1; // 1-20
  let idIdx = Math.floor(Math.random() * 20) + 1; // 1-20
  if (idIdx === assocIdx) {
    idIdx = (idIdx % 20) + 1;
  } // must differ

  const assocStr = CIPHER_PAD[assocIdx - 1];
  const idStr = CIPHER_PAD[idIdx - 1];

  // MUMPS $TR(PIECE,IDSTR,ASSOCSTR): find char in idStr, replace with char
  // at same position in assocStr.  Spaces are translated like any other char
  // so context names like "OR CPRS GUI CHART" round-trip correctly.
  let s = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i);
    const pos = idStr.indexOf(ch);
    s += pos === -1 ? ch : assocStr.charAt(pos);
  }

  // chr(IDIX+31) at front, chr(ASSOCIX+31) at end
  return String.fromCharCode(idIdx + 31) + s + String.fromCharCode(assocIdx + 31);
}

// ---- Helpers: response prefix strip + hex debug -------------------------

/** Strip leading \x00 bytes that VistA prepends to broker responses. */
function stripNulls(s: string): string {
  let i = 0;
  while (i < s.length && s.charCodeAt(i) === 0) i++;
  return i > 0 ? s.substring(i) : s;
}

/** Log raw hex of a packet (never logs more than 200 hex chars). */
function dbgHex(label: string, data: string): void {
  if (process.env.VISTA_DEBUG !== 'true') return;
  const hex = Buffer.from(data, 'latin1').toString('hex').substring(0, 400);
  log.debug(`[RPC-HEX] ${label}`, { hex });
}

// ---- Socket I/O with proper EOT-based framing ---------------------------

let sock: Socket | null = null;
let connected = false;
let readBuf = ''; // persistent buffer across readToEOT calls
let sessionDuz = ''; // DUZ of authenticated user (set during connect)
let lastActivityMs = 0; // timestamp of last successful socket I/O

/** Max idle time before we consider the socket potentially half-open (5 min). */
const SOCKET_MAX_IDLE_MS = 5 * 60 * 1000;

/** Check if the socket is likely still alive (not half-open). */
function isSocketHealthy(): boolean {
  if (!sock || sock.destroyed || !connected) return false;
  // If we haven't used the socket in > SOCKET_MAX_IDLE_MS, assume it may be half-open
  if (lastActivityMs > 0 && Date.now() - lastActivityMs > SOCKET_MAX_IDLE_MS) {
    dbg('STALE', `Socket idle for ${Date.now() - lastActivityMs}ms, forcing reconnect`);
    return false;
  }
  return true;
}

/** Record a successful socket interaction. */
function touchActivity(): void {
  lastActivityMs = Date.now();
}

/** Send raw bytes to broker (latin1 preserves byte values). */
function rawSend(data: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!sock || sock.destroyed) return reject(new Error('Socket closed'));
    sock.write(Buffer.from(data, 'latin1'), (err) => {
      if (err) return reject(new Error('Send: ' + err.message));
      touchActivity();
      resolve();
    });
  });
}

/** Read from broker until EOT byte. Returns everything before the EOT. */
function readToEOT(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!sock || sock.destroyed) return reject(new Error('Socket closed'));

    // Check if a complete response is already buffered
    const existing = readBuf.indexOf(EOT);
    if (existing !== -1) {
      const result = readBuf.substring(0, existing);
      readBuf = readBuf.substring(existing + 1);
      touchActivity();
      return resolve(result);
    }

    function onData(chunk: Buffer) {
      readBuf += chunk.toString('latin1');
      const i = readBuf.indexOf(EOT);
      if (i !== -1) {
        cleanup();
        const result = readBuf.substring(0, i);
        readBuf = readBuf.substring(i + 1);
        touchActivity();
        resolve(result);
      }
    }

    function onErr(e: Error) {
      cleanup();
      reject(new Error('Read: ' + e.message));
    }

    function onClose() {
      cleanup();
      if (readBuf.length > 0) {
        const result = readBuf;
        readBuf = '';
        resolve(result);
      } else {
        reject(new Error('Connection closed before response'));
      }
    }

    const timer = setTimeout(() => {
      cleanup();
      // Include buffer content in error for debugging
      const preview = readBuf.substring(0, 200).replace(/[\x00-\x1f]/g, '.');
      reject(
        new Error(
          `Read timeout (${TIMEOUT_MS}ms). Received so far (${readBuf.length} bytes): ${preview}`
        )
      );
    }, TIMEOUT_MS);

    function cleanup() {
      clearTimeout(timer);
      sock?.removeListener('data', onData);
      sock?.removeListener('error', onErr);
      sock?.removeListener('close', onClose);
    }

    sock.on('data', onData);
    sock.once('error', onErr);
    sock.once('close', onClose);
  });
}

// ---- Public API ---------------------------------------------------------

/**
 * Connect, authenticate, and set context on the VistA RPC Broker.
 *
 * Sequence: TCP connect -> TCPConnect handshake -> XUS SIGNON SETUP ->
 *           XUS AV CODE (encrypted) -> XWB CREATE CONTEXT (encrypted)
 */
export async function connect(): Promise<void> {
  // AGENTS.md #14: detect half-open sockets via staleness check
  if (connected && sock && !sock.destroyed && isSocketHealthy()) return;
  // If socket exists but is stale, clean it up first
  if (sock && !sock.destroyed) {
    dbg('RECONNECT', 'Cleaning up stale socket before reconnecting');
    try {
      sock.destroy();
    } catch {
      /* best effort */
    }
    sock = null;
    connected = false;
    readBuf = '';
    sessionDuz = '';
  }

  validateCredentials();

  // 1. TCP connect
  dbg('CONNECT', VISTA_HOST + ':' + VISTA_PORT);
  sock = await new Promise<Socket>((resolve, reject) => {
    const s = createConnection({ host: VISTA_HOST, port: VISTA_PORT });
    // Enable TCP keepalive to detect dead peers (AGENTS.md #14)
    s.setKeepAlive(true, 30_000); // probe every 30s
    const timer = setTimeout(() => {
      s.destroy();
      reject(new Error('TCP connect timeout'));
    }, TIMEOUT_MS);
    s.once('connect', () => {
      clearTimeout(timer);
      resolve(s);
    });
    s.once('error', (e) => {
      clearTimeout(timer);
      reject(new Error('TCP: ' + e.message));
    });
  });
  readBuf = '';

  // Detect half-open state: fully reset on unexpected close/error
  // (AGENTS.md #14 - half-open socket detection)
  // Must clear readBuf + sessionDuz so stale data doesn't leak across reconnects.
  sock.once('close', () => {
    connected = false;
    readBuf = '';
    sessionDuz = '';
  });
  sock.on('error', () => {
    connected = false;
    readBuf = '';
    sessionDuz = '';
  });
  touchActivity();

  // 2. XWB TCPConnect handshake
  const tcpMsg = buildTCPConnect('127.0.0.1', 0);
  dbg('SEND', 'TCPConnect');
  dbgHex('SEND TCPConnect', tcpMsg);
  await rawSend(tcpMsg);
  const tcpResp = stripNulls(await readToEOT());
  dbg('RECV TCPConnect', tcpResp);
  dbgHex('RECV TCPConnect', tcpResp);
  if (!tcpResp.toLowerCase().includes('accept')) {
    throw new Error('TCPConnect rejected: ' + tcpResp.replace(/[\x00-\x1f]/g, '.').trim());
  }

  // 3. XUS SIGNON SETUP (no params -- returns server info)
  const signOnMsg = buildRpcMessage('XUS SIGNON SETUP');
  dbg('SEND', 'XUS SIGNON SETUP');
  dbgHex('SEND SIGNON SETUP', signOnMsg);
  await rawSend(signOnMsg);
  const setupResp = stripNulls(await readToEOT());
  dbg('RECV SIGNON SETUP', setupResp.substring(0, 200));
  dbgHex('RECV SIGNON SETUP', setupResp);

  // 4. XUS AV CODE (credentials encrypted with CipherPad)
  dbg('SEND', 'XUS AV CODE (credentials NOT logged)');
  const avPlain = VISTA_ACCESS_CODE + ';' + VISTA_VERIFY_CODE;
  const avEnc = cipherEncrypt(avPlain);
  const avMsg = buildRpcMessage('XUS AV CODE', [avEnc]);
  dbgHex('SEND AV CODE', avMsg);
  await rawSend(avMsg);
  const avResp = stripNulls(await readToEOT());
  dbg('RECV AV CODE', avResp.substring(0, 200));
  dbgHex('RECV AV CODE', avResp);

  // Parse: first line is DUZ. "0" means failure.
  const avLines = avResp.split(/\r?\n/);
  const duz = avLines[0]?.trim();
  if (!duz || duz === '0') {
    // Error reason is typically on line 3 or 4
    const reason = avLines[3]?.trim() || avLines[2]?.trim() || avLines[1]?.trim() || avResp;
    throw new Error('Sign-on failed (DUZ=0). ' + reason.replace(/[\x00-\x1f]/g, ' ').trim());
  }
  dbg('SIGNED ON', 'DUZ=' + duz);
  sessionDuz = duz;

  // 5. XWB CREATE CONTEXT (context name encrypted with CipherPad)
  dbg('SEND', 'XWB CREATE CONTEXT: ' + VISTA_CONTEXT);
  const ctxEnc = cipherEncrypt(VISTA_CONTEXT);
  const ctxMsg = buildRpcMessage('XWB CREATE CONTEXT', [ctxEnc]);
  dbgHex('SEND CREATE CONTEXT', ctxMsg);
  await rawSend(ctxMsg);
  const ctxResp = stripNulls(await readToEOT());
  dbg('RECV CREATE CONTEXT', ctxResp);
  dbgHex('RECV CREATE CONTEXT', ctxResp);

  const ctxVal = ctxResp.split(/\r?\n/)[0]?.trim();
  if (ctxVal !== '1') {
    throw new Error('Set context failed: ' + ctxResp.replace(/[\x00-\x1f]/g, ' ').trim());
  }

  connected = true;
  dbg('READY', 'Broker authenticated, context set');
}

/** Disconnect from broker (sends properly-framed BYE then closes socket). */
export function disconnect(): void {
  if (sock && !sock.destroyed) {
    try {
      // Use XWB-framed BYE message (fixes BUG-036 / AGENTS.md #28 dead-code gap)
      const bye = buildBye();
      sock.write(Buffer.from(bye, 'latin1'));
    } catch {
      // best-effort — socket may already be half-closed
    }
    sock.destroy();
  }
  sock = null;
  connected = false;
  readBuf = '';
  sessionDuz = '';
}

/** Call an RPC and return the response split into lines. */
export async function callRpc(rpcName: string, params: string[] = []): Promise<string[]> {
  if (!connected || !sock || sock.destroyed) {
    throw new Error('Not connected. Call connect() first.');
  }

  dbg('RPC CALL', rpcName);
  const rpcMsg = buildRpcMessage(rpcName, params);
  dbgHex('SEND RPC', rpcMsg);
  const start = Date.now();
  try {
    await rawSend(rpcMsg);
    const resp = stripNulls(await readToEOT());
    dbg('RPC RESP', resp.substring(0, 300));
    dbgHex('RECV RPC', resp);
    const lines = resp.split(/\r?\n/).filter((l) => l.length > 0);
    // Phase 96B: record trace
    recordRpcTrace({
      rpcName,
      params: [], // PHI-safe: never log raw params
      durationMs: Date.now() - start,
      success: true,
      responseLines: lines.length,
      duz: sessionDuz,
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
      duz: sessionDuz,
      requestId: getRequestId(),
    });
    throw err;
  }
}

/** Return the DUZ of the authenticated user (set during connect). */
export function getDuz(): string {
  return sessionDuz;
}

/**
 * Typed RPC parameter: either a literal string or a key-value list.
 * Used by callRpcWithList for RPCs that need LIST-type params.
 */
export type RpcParam =
  | { type: 'literal'; value: string }
  | { type: 'list'; value: Record<string, string> };

/**
 * Build an RPC message with mixed literal + list params.
 * Same framing as buildRpcMessage but supports LIST-type params (type 2).
 *
 * LIST wire format (from XWBPRS PRS5):
 *   "2" + [LPack(key) + LPack(value) + continuation]...
 *   continuation = "t" (more entries) or "f" (last entry / end-of-param)
 *
 * Keys must include MUMPS double-quotes so LINST^XWBPRS correctly sets
 * string subscripts: LPack('"GMRAGNT"') not LPack('GMRAGNT').
 */
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
        // LIST param: type "2", then entries, "f" on last entry
        const entries = Object.entries(p.value);
        msg += '2';
        entries.forEach(([key, val], idx) => {
          // Wrap key in MUMPS double-quotes for string subscripts
          const quotedKey = '"' + key + '"';
          msg += lPack(quotedKey) + lPack(val);
          msg += idx < entries.length - 1 ? 't' : 'f';
        });
      }
    }
  }
  return msg + EOT;
}

/**
 * Call an RPC with mixed literal and list parameters.
 * Use this for RPCs like ORWDAL32 SAVE ALLERGY that need LIST-type params.
 */
export async function callRpcWithList(rpcName: string, params: RpcParam[]): Promise<string[]> {
  if (!connected || !sock || sock.destroyed) {
    throw new Error('Not connected. Call connect() first.');
  }

  dbg('RPC CALL', rpcName);
  const rpcMsg = buildRpcMessageEx(rpcName, params);
  dbgHex('SEND RPC', rpcMsg);
  const start = Date.now();
  try {
    await rawSend(rpcMsg);
    const resp = stripNulls(await readToEOT());
    dbg('RPC RESP', resp.substring(0, 300));
    dbgHex('RECV RPC', resp);
    const lines = resp.split(/\r?\n/).filter((l) => l.length > 0);
    // Phase 96B: record trace
    recordRpcTrace({
      rpcName,
      params: [],
      durationMs: Date.now() - start,
      success: true,
      responseLines: lines.length,
      duz: sessionDuz,
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
      duz: sessionDuz,
      requestId: getRequestId(),
    });
    throw err;
  }
}

// ---- Phase 13: User authentication with custom credentials ----

/**
 * Authenticate a user against VistA with supplied access/verify codes.
 * Opens a temporary TCP connection, performs the full handshake + XUS AV CODE,
 * retrieves user info via XUS GET USER INFO, then disconnects.
 *
 * Returns user metadata on success, throws on failure.
 */
export async function authenticateUser(
  accessCode: string,
  verifyCode: string
): Promise<{
  duz: string;
  userName: string;
  divisionIen: string;
  facilityStation: string;
  facilityName: string;
}> {
  const host = VISTA_HOST;
  const port = VISTA_PORT;
  const context = VISTA_CONTEXT;

  // Temporary connection (separate from global sock)
  let tmpSock: Socket;
  let tmpBuf = '';

  function tmpRawSend(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!tmpSock || tmpSock.destroyed) return reject(new Error('Socket closed'));
      tmpSock.write(Buffer.from(data, 'latin1'), (err) =>
        err ? reject(new Error('Send: ' + err.message)) : resolve()
      );
    });
  }

  function tmpReadToEOT(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!tmpSock || tmpSock.destroyed) return reject(new Error('Socket closed'));
      const existing = tmpBuf.indexOf(EOT);
      if (existing !== -1) {
        const result = tmpBuf.substring(0, existing);
        tmpBuf = tmpBuf.substring(existing + 1);
        return resolve(result);
      }
      function onData(chunk: Buffer) {
        tmpBuf += chunk.toString('latin1');
        const i = tmpBuf.indexOf(EOT);
        if (i !== -1) {
          cleanup();
          const result = tmpBuf.substring(0, i);
          tmpBuf = tmpBuf.substring(i + 1);
          resolve(result);
        }
      }
      function onErr(e: Error) {
        cleanup();
        reject(new Error('Read: ' + e.message));
      }
      function onClose() {
        cleanup();
        if (tmpBuf.length > 0) {
          const r = tmpBuf;
          tmpBuf = '';
          resolve(r);
        } else reject(new Error('Connection closed before response'));
      }
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Read timeout'));
      }, TIMEOUT_MS);
      function cleanup() {
        clearTimeout(timer);
        tmpSock?.removeListener('data', onData);
        tmpSock?.removeListener('error', onErr);
        tmpSock?.removeListener('close', onClose);
      }
      tmpSock.on('data', onData);
      tmpSock.once('error', onErr);
      tmpSock.once('close', onClose);
    });
  }

  function tmpDisconnect() {
    if (tmpSock && !tmpSock.destroyed) {
      try {
        tmpSock.write(Buffer.from('#BYE#', 'latin1'));
      } catch {
        /* best-effort */
      }
      tmpSock.destroy();
    }
  }

  // 1. TCP connect
  dbg('AUTH CONNECT', host + ':' + port);
  tmpSock = await new Promise<Socket>((resolve, reject) => {
    const s = createConnection({ host, port });
    const timer = setTimeout(() => {
      s.destroy();
      reject(new Error('TCP connect timeout'));
    }, TIMEOUT_MS);
    s.once('connect', () => {
      clearTimeout(timer);
      resolve(s);
    });
    s.once('error', (e) => {
      clearTimeout(timer);
      reject(new Error('TCP: ' + e.message));
    });
  });

  try {
    // 2. TCPConnect
    await tmpRawSend(buildTCPConnect('127.0.0.1', 0));
    const tcpResp = stripNulls(await tmpReadToEOT());
    if (!tcpResp.toLowerCase().includes('accept')) {
      throw new Error('TCPConnect rejected: ' + tcpResp.replace(/[\x00-\x1f]/g, '.').trim());
    }

    // 3. XUS SIGNON SETUP
    await tmpRawSend(buildRpcMessage('XUS SIGNON SETUP'));
    await tmpReadToEOT(); // server info (not needed)

    // 4. XUS AV CODE
    const avPlain = accessCode + ';' + verifyCode;
    const avEnc = cipherEncrypt(avPlain);
    await tmpRawSend(buildRpcMessage('XUS AV CODE', [avEnc]));
    const avResp = stripNulls(await tmpReadToEOT());
    const avLines = avResp.split(/\r?\n/);
    const duz = avLines[0]?.trim();
    if (!duz || duz === '0') {
      const reason =
        avLines[3]?.trim() || avLines[2]?.trim() || avLines[1]?.trim() || 'Invalid credentials';
      throw new Error('Authentication failed: ' + reason.replace(/[\x00-\x1f]/g, ' ').trim());
    }

    // 5. Set Context
    const ctxEnc = cipherEncrypt(context);
    await tmpRawSend(buildRpcMessage('XWB CREATE CONTEXT', [ctxEnc]));
    const ctxResp = stripNulls(await tmpReadToEOT());
    if (ctxResp.split(/\r?\n/)[0]?.trim() !== '1') {
      throw new Error('Set context failed');
    }

    // 6. XUS GET USER INFO — returns user details
    await tmpRawSend(buildRpcMessage('XUS GET USER INFO'));
    const userResp = stripNulls(await tmpReadToEOT());
    const userLines = userResp.split(/\r?\n/);
    // Line 0: DUZ, Line 1: user name, Line 2: ???, Line 3: division info
    const userName = userLines[1]?.trim() || 'Unknown User';
    const divLine = userLines[3]?.trim() || '';
    // Division format: IEN^station^name (e.g., "500^500^CAMP MASTER")
    const divParts = divLine.split('^');
    const divisionIen = divParts[0] || '500';
    const facilityStation = divParts[1] || '500';
    const facilityName = divParts[2] || 'WorldVistA EHR';

    return { duz, userName, divisionIen, facilityStation, facilityName };
  } finally {
    tmpDisconnect();
  }
}
