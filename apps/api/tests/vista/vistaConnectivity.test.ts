/**
 * VistA Connectivity Test Suite — Phase P1-1
 *
 * Tests the VistaRpcBridge class against a live VistA instance.
 * All tests are skipped if VISTA_HOST is not set in the environment.
 *
 * To run with a live VistA Docker sandbox:
 *   VISTA_HOST=127.0.0.1 VISTA_PORT=9430 VISTA_ACCESS_CODE=PROV123 VISTA_VERIFY_CODE=PROV123!! \
 *     pnpm -C apps/api test -- tests/vista/vistaConnectivity.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { VistaRpcBridge } from '../../src/services/vistaRpcBridge.js';

const VISTA_HOST = process.env.VISTA_HOST;
const VISTA_PORT = Number(process.env.VISTA_PORT || 9430);
const VISTA_ACCESS = process.env.VISTA_ACCESS_CODE || '';
const VISTA_VERIFY = process.env.VISTA_VERIFY_CODE || '';
const hasVista = !!VISTA_HOST && !!VISTA_ACCESS && !!VISTA_VERIFY;

describe.skipIf(!hasVista)('VistA RPC Connectivity', () => {
  let bridge: VistaRpcBridge;

  beforeAll(() => {
    bridge = new VistaRpcBridge({
      host: VISTA_HOST!,
      port: VISTA_PORT,
      accessCode: VISTA_ACCESS,
      verifyCode: VISTA_VERIFY,
    });
  });

  afterAll(async () => {
    if (bridge?.isConnected) {
      await bridge.disconnect();
    }
  });

  // ── Test 1: connect() resolves without error ──────────────────────
  it('should connect to VistA without error', async () => {
    await bridge.connect();
    expect(bridge.isConnected).toBe(true);
    expect(bridge.duz).toBeTruthy();
  });

  // ── Test 2: ORWU USERINFO returns user info ──────────────────────
  it('should call ORWU USERINFO and return user info', async () => {
    const result = await bridge.call('ORWU USERINFO', []);
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
    // ORWU USERINFO returns a multi-line response with DUZ on first line
  });

  // ── Test 3: ORWPT LIST ALL returns at least 1 patient ────────────
  it('should call ORWPT LIST ALL and return patients', async () => {
    // ORWPT LIST ALL params: [startFrom, direction]
    // startFrom="" gets beginning of list, "1" = forward
    const result = await bridge.call('ORWPT LIST ALL', ['', '1']);
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  // ── Test 4: ORWORDG IEN returns valid response ───────────────────
  it('should call ORWORDG IEN and return a valid response', async () => {
    // ORWORDG IEN returns the IEN of a display group — a simple read RPC
    // that validates RPC call round-trip without needing a patient context
    const result = await bridge.call('ORWORDG IEN', ['ALL']);
    expect(result).toBeDefined();
    // May return an IEN number (string) or empty — both are valid VistA responses
  });

  // ── Test 5: disconnect() resolves without error ──────────────────
  it('should disconnect without error', async () => {
    await bridge.disconnect();
    expect(bridge.isConnected).toBe(false);
  });

  // ── Test 6: call() after disconnect throws ────────────────────────
  it('should throw when calling RPC after disconnect', async () => {
    await expect(bridge.call('ORWU USERINFO', [])).rejects.toThrow('Not connected');
  });
});
