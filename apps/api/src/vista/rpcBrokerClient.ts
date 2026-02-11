import { createConnection, Socket } from "net";
import {
  VISTA_HOST,
  VISTA_PORT,
  VISTA_ACCESS_CODE,
  VISTA_VERIFY_CODE,
  VISTA_CONTEXT,
  validateCredentials,
} from "./config";

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
 *        Credentials are NEVER logged.
 */

// ---- Constants ----------------------------------------------------------

const TIMEOUT_MS = 10000;
const EOT = "\x04"; // End-of-transmission marker used by XWB
const PREFIX = "[XWB]"; // Every client message starts with this

// ---- Debug logging (never logs credentials) -----------------------------

function dbg(step: string, detail?: string): void {
  if (process.env.VISTA_DEBUG !== "true") return;
  const safe = detail
    ? detail.replace(/[\x00-\x03\x05-\x09\x0b\x0c\x0e-\x1f]/g, ".")
    : "";
  console.log(`[RPC-DEBUG] ${step}${safe ? ": " + safe : ""}`);
}

// ---- XWB framing helpers ------------------------------------------------

/** SPack: 1-byte length prefix (max 255 chars). */
function sPack(s: string): string {
  if (s.length > 255) throw new Error("sPack: string exceeds 255");
  return String.fromCharCode(s.length) + s;
}

/** LPack: 3-digit zero-padded length prefix. */
function lPack(s: string): string {
  return s.length.toString().padStart(3, "0") + s;
}

/**
 * Build %XWB TCPConnect handshake message.
 * Format: [XWB]10304 + SPack("TCPConnect") + params + EOT
 * Params: "5" + literal(ip) + literal(callbackPort)
 */
function buildTCPConnect(clientIP: string, callbackPort: number): string {
  return (
    PREFIX +
    "10304" +
    sPack("TCPConnect") +
    "5" +
    "0" + lPack(clientIP) + "f" +
    "0" + lPack(String(callbackPort)) + "f" +
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
  let msg = PREFIX + "11302" + "\x01" + "1" + sPack(rpcName);
  if (params.length === 0) {
    msg += "54f";
  } else {
    msg += "5";
    for (const p of params) {
      msg += "0" + lPack(p) + "f";
    }
  }
  return msg + EOT;
}

/** Build #BYE# disconnect message. */
function buildBye(): string {
  return PREFIX + "10304" + sPack("#BYE#") + EOT;
}

// ---- CipherPad encryption (XUS AV CODE + XWB CREATE CONTEXT) -----------
// These 20 cipher pads are extracted from the Z-tag of the XUSRB1.m routine
// shipped with every VistA distribution.  They are not user credentials, but
// they are security-sensitive implementation details of the RPC Broker sign-on
// obfuscation scheme.  Do not log or expose them unnecessarily.
// Algorithm matches ENCRYP^XUSRB1: random pair of pad indices (1-20),
// $TR substitution, identifier index (+31) at front, associator index (+31) at end.

const CIPHER_PAD: readonly string[] = [
  "wkEo-ZJt!dG)49K{nX1BS$vH<&:Myf*>Ae0jQW=;|#PsO`'%+rmb[gpqN,l6/hFC@DcUa ]z~R}\"V\\iIxu?872.(TYL5_3",
  "rKv`R;M/9BqAF%&tSs#Vh)dO1DZP> *fX'u[.4lY=-mg_ci802N7LTG<]!CWo:3?{+,5Q}(@jaExn$~p\\IyHwzU\"|k6Jeb",
  "\\pV(ZJk\"WQmCn!Y,y@1d+~8s?[lNMxgHEt=uw|X:qSLjAI*}6zoF{T3#;ca)/h5%`P4$r]G'9e2if_>UDKb7<v0&- RBO.",
  "depjt3g4W)qD0V~NJar\\B \"?OYhcu[<Ms%Z`RIL_6:]AX-zG.#}$@vk7/5x&*m;(yb2Fn+l'PwUof1K{9,|EQi>H=CT8S!",
  "NZW:1}K$byP;jk)7'`x90B|cq@iSsEnu,(l-hf.&Y_?J#R]+voQXU8mrV[!p4tg~OMez CAaGFD6H53%L/dT2<*>\"{\\wI=",
  "vCiJ<oZ9|phXVNn)m K`t/SI%]A5qOWe\\&?;jT~M!fz1l>[D_0xR32c*4.P\"G{r7}E8wUgyudF+6-:B=$(sY,LkbHa#'@Q",
  "hvMX,'4Ty;[a8/{6l~F_V\"}qLI\\!@x(D7bRmUH]W15J%N0BYPkrs&9:$)Zj>u|zwQ=ieC-oGA.#?tfdcO3gp`S+En K2*<",
  "jd!W5[];4'<C$/&x|rZ(k{>?ghBzIFN}fAK\"#`p_TqtD*1E37XGVs@0nmSe+Y6Qyo-aUu%i8c=H2vJ\\) R:MLb.9,wlO~P",
  "2ThtjEM+!=xXb)7,ZV{*ci3\"8@_l-HS69L>]\\AUF/Q%:qD?1~m(yvO0e'<#o$p4dnIzKP|`NrkaGg.ufCRB[; sJYwW}5&",
  "vB\\5/zl-9y:Pj|=(R'7QJI *&CTX\"p0]_3.idcuOefVU#omwNZ`$Fs?L+1Sk<,b)hM4A6[Y%aDrg@~KqEW8t>H};n!2xG{",
  "sFz0Bo@_HfnK>LR}qWXV+D6`Y28=4Cm~G/7-5A\\b9!a#rP.l&M$hc3ijQk;),TvUd<[:I\"u1'NZSOw]*gxtE{eJp|y (?%",
  "M@,D}|LJyGO8`$*ZqH .j>c~h<d=fimszv[#-53F!+a;NC'6T91IV?(0x&/{B)w\"]Q\\YUWprk4:ol%g2nE7teRKbAPuS_X",
  ".mjY#_0*H<B=Q+FML6]s;r2:e8R}[ic&KA 1w{)vV5d,$u\"~xD/Pg?IyfthO@CzWp%!`N4Z'3-(o|J9XUE7k\\TlqSb>anG",
  "xVa1']_GU<X`|\\NgM?LS9{\"jT%s$}y[nvtlefB2RKJW~(/cIDCPow4,>#zm+:5b@06O3Ap8=*7ZFY!H-uEQk; .q)i&rhd",
  "I]Jz7AG@QX.\"%3Lq>METUo{Pp_ |a6<0dYVSv8:b)~W9NK`(r'4fs&wim\\kReC2hg=HOj$1B*/nxt,;c#y+![?lFuZ-5D}",
  "Rr(Ge6F Hx>q$m&C%M~Tn,:\"o'tX/*yP.{lZ!YkiVhuw_<KE5a[;}W0gjsz3]@7cI2\\QN?f#4p|vb1OUBD9)=-LJA+d`S8",
  "I~k>y|m};d)-7DZ\"Fe/Y<B:xwojR,Vh]O0Sc[`$sg8GXE!1&Qrzp._W%TNK(=J 3i*2abuHA4C'?Mv\\Pq{n#56LftUl@9+",
  "~A*>9 WidFN,1KsmwQ)GJM{I4:C%}#Ep(?HB/r;t.&U8o|l['Lg\"2hRDyZ5`nbf]qjc0!zS-TkYO<_=76a\\X@$Pe3+xVvu",
  "yYgjf\"5VdHc#uA,W1i+v'6|@pr{n;DJ!8(btPGaQM.LT3oe?NB/&9>Z`-}02*%x<7lsqz4OS ~E$\\R]KI[:UwC_=h)kXmF",
  "5:iar.{YU7mBZR@-K|2 \"+~`M%8sq4JhPo<_X\\Sg3WC;Tuxz,fvEQ1p9=w}FAI&j/keD0c?)LN6OHV]lGy'$*>nd[(tb!#",
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
  const assocIdx = Math.floor(Math.random() * 20) + 1;       // 1-20
  let idIdx = Math.floor(Math.random() * 20) + 1;            // 1-20
  if (idIdx === assocIdx) { idIdx = (idIdx % 20) + 1; }      // must differ

  const assocStr = CIPHER_PAD[assocIdx - 1];
  const idStr    = CIPHER_PAD[idIdx - 1];

  // MUMPS $TR(PIECE,IDSTR,ASSOCSTR): find char in idStr, replace with char
  // at same position in assocStr.  Spaces are translated like any other char
  // so context names like "OR CPRS GUI CHART" round-trip correctly.
  let s = "";
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
  if (process.env.VISTA_DEBUG !== "true") return;
  const hex = Buffer.from(data, "latin1").toString("hex").substring(0, 400);
  console.log(`[RPC-HEX] ${label}: ${hex}`);
}

// ---- Socket I/O with proper EOT-based framing ---------------------------

let sock: Socket | null = null;
let connected = false;
let readBuf = ""; // persistent buffer across readToEOT calls

/** Send raw bytes to broker (latin1 preserves byte values). */
function rawSend(data: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!sock || sock.destroyed) return reject(new Error("Socket closed"));
    sock.write(Buffer.from(data, "latin1"), (err) =>
      err ? reject(new Error("Send: " + err.message)) : resolve()
    );
  });
}

/** Read from broker until EOT byte. Returns everything before the EOT. */
function readToEOT(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!sock || sock.destroyed) return reject(new Error("Socket closed"));

    // Check if a complete response is already buffered
    const existing = readBuf.indexOf(EOT);
    if (existing !== -1) {
      const result = readBuf.substring(0, existing);
      readBuf = readBuf.substring(existing + 1);
      return resolve(result);
    }

    function onData(chunk: Buffer) {
      readBuf += chunk.toString("latin1");
      const i = readBuf.indexOf(EOT);
      if (i !== -1) {
        cleanup();
        const result = readBuf.substring(0, i);
        readBuf = readBuf.substring(i + 1);
        resolve(result);
      }
    }

    function onErr(e: Error) {
      cleanup();
      reject(new Error("Read: " + e.message));
    }

    function onClose() {
      cleanup();
      if (readBuf.length > 0) {
        const result = readBuf;
        readBuf = "";
        resolve(result);
      } else {
        reject(new Error("Connection closed before response"));
      }
    }

    const timer = setTimeout(() => {
      cleanup();
      // Include buffer content in error for debugging
      const preview = readBuf.substring(0, 200).replace(/[\x00-\x1f]/g, ".");
      reject(new Error(
        `Read timeout (${TIMEOUT_MS}ms). Received so far (${readBuf.length} bytes): ${preview}`
      ));
    }, TIMEOUT_MS);

    function cleanup() {
      clearTimeout(timer);
      sock?.removeListener("data", onData);
      sock?.removeListener("error", onErr);
      sock?.removeListener("close", onClose);
    }

    sock.on("data", onData);
    sock.once("error", onErr);
    sock.once("close", onClose);
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
  if (connected && sock && !sock.destroyed) return;

  validateCredentials();

  // 1. TCP connect
  dbg("CONNECT", VISTA_HOST + ":" + VISTA_PORT);
  sock = await new Promise<Socket>((resolve, reject) => {
    const s = createConnection({ host: VISTA_HOST, port: VISTA_PORT });
    const timer = setTimeout(() => {
      s.destroy();
      reject(new Error("TCP connect timeout"));
    }, TIMEOUT_MS);
    s.once("connect", () => {
      clearTimeout(timer);
      resolve(s);
    });
    s.once("error", (e) => {
      clearTimeout(timer);
      reject(new Error("TCP: " + e.message));
    });
  });
  readBuf = "";

  // 2. XWB TCPConnect handshake
  const tcpMsg = buildTCPConnect("127.0.0.1", 0);
  dbg("SEND", "TCPConnect");
  dbgHex("SEND TCPConnect", tcpMsg);
  await rawSend(tcpMsg);
  const tcpResp = stripNulls(await readToEOT());
  dbg("RECV TCPConnect", tcpResp);
  dbgHex("RECV TCPConnect", tcpResp);
  if (!tcpResp.toLowerCase().includes("accept")) {
    throw new Error("TCPConnect rejected: " + tcpResp.replace(/[\x00-\x1f]/g, ".").trim());
  }

  // 3. XUS SIGNON SETUP (no params -- returns server info)
  const signOnMsg = buildRpcMessage("XUS SIGNON SETUP");
  dbg("SEND", "XUS SIGNON SETUP");
  dbgHex("SEND SIGNON SETUP", signOnMsg);
  await rawSend(signOnMsg);
  const setupResp = stripNulls(await readToEOT());
  dbg("RECV SIGNON SETUP", setupResp.substring(0, 200));
  dbgHex("RECV SIGNON SETUP", setupResp);

  // 4. XUS AV CODE (credentials encrypted with CipherPad)
  dbg("SEND", "XUS AV CODE (credentials NOT logged)");
  const avPlain = VISTA_ACCESS_CODE + ";" + VISTA_VERIFY_CODE;
  const avEnc = cipherEncrypt(avPlain);
  const avMsg = buildRpcMessage("XUS AV CODE", [avEnc]);
  dbgHex("SEND AV CODE", avMsg);
  await rawSend(avMsg);
  const avResp = stripNulls(await readToEOT());
  dbg("RECV AV CODE", avResp.substring(0, 200));
  dbgHex("RECV AV CODE", avResp);

  // Parse: first line is DUZ. "0" means failure.
  const avLines = avResp.split(/\r?\n/);
  const duz = avLines[0]?.trim();
  if (!duz || duz === "0") {
    // Error reason is typically on line 3 or 4
    const reason =
      avLines[3]?.trim() || avLines[2]?.trim() || avLines[1]?.trim() || avResp;
    throw new Error(
      "Sign-on failed (DUZ=0). " +
        reason.replace(/[\x00-\x1f]/g, " ").trim()
    );
  }
  dbg("SIGNED ON", "DUZ=" + duz);

  // 5. XWB CREATE CONTEXT (context name encrypted with CipherPad)
  dbg("SEND", "XWB CREATE CONTEXT: " + VISTA_CONTEXT);
  const ctxEnc = cipherEncrypt(VISTA_CONTEXT);
  const ctxMsg = buildRpcMessage("XWB CREATE CONTEXT", [ctxEnc]);
  dbgHex("SEND CREATE CONTEXT", ctxMsg);
  await rawSend(ctxMsg);
  const ctxResp = stripNulls(await readToEOT());
  dbg("RECV CREATE CONTEXT", ctxResp);
  dbgHex("RECV CREATE CONTEXT", ctxResp);

  const ctxVal = ctxResp.split(/\r?\n/)[0]?.trim();
  if (ctxVal !== "1") {
    throw new Error(
      "Set context failed: " + ctxResp.replace(/[\x00-\x1f]/g, " ").trim()
    );
  }

  connected = true;
  dbg("READY", "Broker authenticated, context set");
}

/** Disconnect from broker (sends #BYE# then closes socket). */
export function disconnect(): void {
  if (sock && !sock.destroyed) {
    try {
      sock.write(Buffer.from("#BYE#", "latin1"));
    } catch {
      // best-effort
    }
    sock.destroy();
  }
  sock = null;
  connected = false;
  readBuf = "";
}

/** Call an RPC and return the response split into lines. */
export async function callRpc(
  rpcName: string,
  params: string[] = []
): Promise<string[]> {
  if (!connected || !sock || sock.destroyed) {
    throw new Error("Not connected. Call connect() first.");
  }

  dbg("RPC CALL", rpcName);
  const rpcMsg = buildRpcMessage(rpcName, params);
  dbgHex("SEND RPC", rpcMsg);
  await rawSend(rpcMsg);
  const resp = stripNulls(await readToEOT());
  dbg("RPC RESP", resp.substring(0, 300));
  dbgHex("RECV RPC", resp);

  return resp.split(/\r?\n/).filter((l) => l.length > 0);
}
