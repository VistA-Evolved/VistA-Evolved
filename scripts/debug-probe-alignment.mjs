#!/usr/bin/env node
/**
 * Debug script: traces raw XWB response bytes for each RPC probe
 * to identify which RPCs produce double-EOT responses that cause
 * readBuf misalignment in the capability probe.
 *
 * Usage: VISTA_HOST=127.0.0.1 VISTA_PORT=9431 \
 *   VISTA_ACCESS_CODE=PRO1234 VISTA_VERIFY_CODE=PRO1234!! \
 *   node scripts/debug-probe-alignment.mjs
 */
import { createConnection } from 'node:net';

const HOST = process.env.VISTA_HOST || '127.0.0.1';
const PORT = parseInt(process.env.VISTA_PORT || '9431', 10);
const ACCESS = process.env.VISTA_ACCESS_CODE || 'PRO1234';
const VERIFY = process.env.VISTA_VERIFY_CODE || 'PRO1234!!';
const CONTEXT = 'OR CPRS GUI CHART';
const EOT = '\x04';
const PREFIX = '[XWB]';
const TIMEOUT = 15000;

// Cipher pads from XUSRB1.m
const CIPHER_PAD = [
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

function sPack(s) { return String.fromCharCode(s.length) + s; }
function lPack(s) {
  const len = s.length.toString();
  return String.fromCharCode(len.length) + len + s;
}

function cipherEncrypt(text) {
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

function buildTCPConnect(ip, port) {
  return PREFIX + '10304' + sPack('TCPConnect') + '5' + '0' + lPack(ip) + 'f' + '0' + lPack(String(port)) + 'f' + EOT;
}

function buildRpcMessage(name, params = []) {
  let msg = PREFIX + '11302' + '\x01' + '1' + sPack(name);
  if (params.length === 0) msg += '54f';
  else { msg += '5'; for (const p of params) msg += '0' + lPack(p) + 'f'; }
  return msg + EOT;
}

// The 87 unique RPCs in probe order (from rpcCapabilities.ts KNOWN_RPCS)
const KNOWN_RPCS = [
  'ORWPT LIST ALL','ORWPT SELECT','ORQPT DEFAULT PATIENT LIST',
  'ORQQAL LIST','ORWDAL32 ALLERGY MATCH','ORWDAL32 SAVE ALLERGY',
  'ORQQVI VITALS','GMV ADD VM','TIU DOCUMENTS BY CONTEXT',
  'TIU CREATE RECORD','TIU SET RECORD TEXT','TIU GET RECORD TEXT',
  'ORWPS ACTIVE','ORWORR GETTXT','ORWDXM AUTOACK',
  'ORQQPL PROBLEM LIST','ORQQPL4 LEX','ORQQPL ADD SAVE','ORQQPL EDIT SAVE',
  'ORWDX SAVE','ORWDXA DC','ORWDXA FLAG','ORWDXA VERIFY',
  'ORWORR AGET','ORWOR1 SIG','ORWDXC ACCEPT',
  'ORQQCN LIST','ORQQCN DETAIL','ORQQCN2 MED RESULTS',
  'ORWSR LIST','ORWSR RPTLIST',
  'ORWLRR INTERIM','ORWLRR ACK','ORWLRR CHART',
  'ORWRP REPORT LISTS','ORWRP REPORT TEXT',
  'ORWORB UNSIG ORDERS','ORWORB FASTUSER',
  'ORWCIRN FACILITIES','MAG4 REMOTE PROCEDURE','RA DETAILED REPORT',
  'ORWPCE SAVE','ORWPCE VISIT','ORWPCE GET VISIT',
  'ORWPCE DIAG','ORWPCE PROC','ORWPCE PCE4NOTE',
  'ORWPCE HASVISIT','ORWPCE GETSVC','ORWPCE4 LEX','ORWPCE LEXCODE',
  'ORWPCE ACTIVE CODE',
  'IBCN INSURANCE QUERY','IBD GET ALL PCE DATA','IBD GET FORMSPEC',
  'IBARXM QUERY ONLY','IBO MT LTC COPAY QUERY',
  'VE INTEROP HL7 LINKS','VE INTEROP HL7 MSGS','VE INTEROP HLO STATUS',
  'VE INTEROP QUEUE DEPTH','VE INTEROP MSG LIST','VE INTEROP MSG DETAIL',
  'ZVE MAIL FOLDERS','ZVE MAIL LIST','ZVE MAIL GET','ZVE MAIL SEND','ZVE MAIL MANAGE',
  'VE LIST RPCS','VE RCM PROVIDER INFO',
  'ZVEADT WARDS','ZVEADT BEDS','ZVEADT MVHIST',
  'DGPM NEW ADMISSION','DGPM NEW TRANSFER','DGPM NEW DISCHARGE',
  'PSB MED LOG','PSB ALLERGY','PSB VALIDATE ORDER','PSJBCMA',
  'NURS TASK LIST','NURS ASSESSMENTS','LR VERIFY',
  'GMRIO RESULTS','GMRIO ADD','ZVENAS LIST','ZVENAS SAVE',
];

// ---- Raw socket I/O ----
let sock;
let readBuf = '';

function rawSend(data) {
  return new Promise((resolve, reject) => {
    sock.write(Buffer.from(data, 'latin1'), (err) => err ? reject(err) : resolve());
  });
}

function readToEOT() {
  return new Promise((resolve, reject) => {
    const idx = readBuf.indexOf(EOT);
    if (idx >= 0) {
      const result = readBuf.substring(0, idx);
      readBuf = readBuf.substring(idx + 1);
      return resolve(result);
    }
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout (${TIMEOUT}ms), readBuf=${readBuf.length} bytes`));
    }, TIMEOUT);
    function onData(chunk) {
      readBuf += chunk.toString('latin1');
      const i = readBuf.indexOf(EOT);
      if (i >= 0) { cleanup(); const r = readBuf.substring(0, i); readBuf = readBuf.substring(i + 1); resolve(r); }
    }
    function onErr(e) { cleanup(); reject(e); }
    function onClose() { cleanup(); reject(new Error('Connection closed')); }
    function cleanup() { clearTimeout(timer); sock.removeListener('data', onData); sock.removeListener('error', onErr); sock.removeListener('close', onClose); }
    sock.on('data', onData);
    sock.once('error', onErr);
    sock.once('close', onClose);
  });
}

// Extended readToEOT that also reports how many EOTs were seen in a single chunk
function readAllAvailable(ms = 200) {
  return new Promise((resolve) => {
    let buf = '';
    function onData(chunk) { buf += chunk.toString('latin1'); }
    sock.on('data', onData);
    setTimeout(() => {
      sock.removeListener('data', onData);
      resolve(buf);
    }, ms);
  });
}

function stripNulls(s) {
  let i = 0;
  while (i < s.length && s.charCodeAt(i) === 0) i++;
  return i > 0 ? s.substring(i) : s;
}

function hexPreview(s, maxLen = 80) {
  return Buffer.from(s, 'latin1').toString('hex').substring(0, maxLen);
}

function printablePreview(s, maxLen = 120) {
  return s.replace(/[\x00-\x1f\x7f-\xff]/g, '.').substring(0, maxLen);
}

async function main() {
  console.log(`Connecting to ${HOST}:${PORT}...`);

  // TCP connect
  sock = await new Promise((resolve, reject) => {
    const s = createConnection({ host: HOST, port: PORT });
    s.setKeepAlive(true, 30000);
    const t = setTimeout(() => { s.destroy(); reject(new Error('TCP timeout')); }, TIMEOUT);
    s.once('connect', () => { clearTimeout(t); resolve(s); });
    s.once('error', (e) => { clearTimeout(t); reject(new Error('TCP: ' + e.message)); });
  });
  readBuf = '';
  console.log('TCP connected');

  // Register error/close handlers
  sock.on('error', (e) => console.log('Socket error:', e.message));
  sock.once('close', () => console.log('Socket closed'));

  // TCPConnect handshake
  const tcpMsg = buildTCPConnect('127.0.0.1', 0);
  console.log('Sending TCPConnect, hex:', hexPreview(tcpMsg, 200));
  await rawSend(tcpMsg);
  const tcpResp = stripNulls(await readToEOT());
  console.log('TCPConnect resp:', JSON.stringify(tcpResp));

  // XUS SIGNON SETUP
  await rawSend(buildRpcMessage('XUS SIGNON SETUP'));
  const signonResp = await readToEOT();
  console.log('Signon setup OK');

  // XUS AV CODE
  const avCode = ACCESS + ';' + VERIFY;
  const encAv = cipherEncrypt(avCode);
  await rawSend(buildRpcMessage('XUS AV CODE', [encAv]));
  const avResp = stripNulls(await readToEOT());
  const duz = avResp.split('\r\n')[0];
  console.log('Auth DUZ:', duz);
  if (duz === '0') { console.error('Auth failed'); process.exit(1); }

  // XWB CREATE CONTEXT
  const encCtx = cipherEncrypt(CONTEXT);
  await rawSend(buildRpcMessage('XWB CREATE CONTEXT', [encCtx]));
  const ctxResp = stripNulls(await readToEOT());
  console.log('Context:', ctxResp);
  if (ctxResp !== '1') { console.error('Context failed:', ctxResp); process.exit(1); }

  console.log(`\n--- Probing ${KNOWN_RPCS.length} RPCs ---\n`);

  const results = [];
  let shiftsDetected = 0;

  for (let i = 0; i < KNOWN_RPCS.length; i++) {
    const rpcName = KNOWN_RPCS[i];

    // Check readBuf state BEFORE sending
    const readBufBefore = readBuf.length;
    const readBufEOTs = (readBuf.match(/\x04/g) || []).length;

    if (readBufBefore > 0) {
      console.log(`  !! readBuf NOT EMPTY before RPC #${i} (${rpcName}): ${readBufBefore} bytes, ${readBufEOTs} EOTs`);
      console.log(`     readBuf hex: ${hexPreview(readBuf, 200)}`);
      console.log(`     readBuf txt: ${printablePreview(readBuf)}`);
      shiftsDetected++;
    }

    try {
      await rawSend(buildRpcMessage(rpcName, []));
      const rawResp = await readToEOT();
      const resp = stripNulls(rawResp);
      const lines = resp.split(/\r?\n/).filter(l => l.length > 0);
      const firstLine = lines[0] || '';

      // Check if this looks like a "doesn't exist" error
      const isMissing = /^[A-Z:]?remote procedure/i.test(firstLine) && /doesn't exist|not found/i.test(resp);

      // Check if readBuf has leftover after read
      const readBufAfter = readBuf.length;
      const readBufAfterEOTs = (readBuf.match(/\x04/g) || []).length;

      const status = isMissing ? 'MISSING' : 'OK';
      console.log(`[${String(i).padStart(2)}] ${rpcName.padEnd(35)} ${status.padEnd(8)} lines=${lines.length} readBufAfter=${readBufAfter}`);
      if (isMissing) {
        console.log(`     Error: ${printablePreview(firstLine, 100)}`);
      }
      if (readBufAfter > 0) {
        console.log(`     !! readBuf has ${readBufAfter} bytes (${readBufAfterEOTs} EOTs) AFTER read`);
        console.log(`     readBuf hex: ${hexPreview(readBuf, 200)}`);
      }

      results.push({ i, rpcName, status, lines: lines.length, firstLine: firstLine.substring(0, 80), readBufBefore, readBufAfter });
    } catch (err) {
      console.log(`[${String(i).padStart(2)}] ${rpcName.padEnd(35)} ERROR: ${err.message}`);
      results.push({ i, rpcName, status: 'ERROR', error: err.message, readBufBefore });
    }
  }

  // Send BYE
  try {
    await rawSend(PREFIX + '10304' + sPack('#BYE#') + EOT);
  } catch {}
  sock.destroy();

  // Summary
  console.log(`\n--- Summary ---`);
  console.log(`Total RPCs: ${KNOWN_RPCS.length}`);
  console.log(`OK: ${results.filter(r => r.status === 'OK').length}`);
  console.log(`MISSING: ${results.filter(r => r.status === 'MISSING').length}`);
  console.log(`ERROR: ${results.filter(r => r.status === 'ERROR').length}`);
  console.log(`Shifts detected (non-empty readBuf before send): ${shiftsDetected}`);

  const misaligned = results.filter(r => r.readBufBefore > 0 || r.readBufAfter > 0);
  if (misaligned.length > 0) {
    console.log(`\nRPCs with readBuf anomalies:`);
    for (const r of misaligned) {
      console.log(`  #${r.i} ${r.rpcName}: before=${r.readBufBefore} after=${r.readBufAfter || 0}`);
    }
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
