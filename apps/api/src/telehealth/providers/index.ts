/**
 * Telehealth Provider Registry -- Phase 30
 *
 * Factory pattern: selects provider by TELEHEALTH_PROVIDER env var.
 * Default: "jitsi" (self-hostable, no vendor lock-in).
 *
 * To add a new provider:
 * 1. Create providers/<name>-provider.ts implementing TelehealthProvider
 * 2. Add it to the registry map below
 * 3. Set TELEHEALTH_PROVIDER=<name> in .env.local
 */

import type { TelehealthProvider } from '../types.js';
import { JitsiProvider } from './jitsi-provider.js';

/* ------------------------------------------------------------------ */
/* Stub provider for testing / future providers                         */
/* ------------------------------------------------------------------ */

/**
 * Stub provider -- returns mock data for testing or as a template
 * for future provider implementations (Zoom, Twilio, WebEx, etc.).
 */
class StubProvider implements TelehealthProvider {
  readonly name = 'Stub';

  async createRoom(appointmentId: string) {
    return {
      roomId: `stub-${appointmentId}-${Date.now()}`,
      meta: { provider: 'stub', note: 'Not a real video provider' },
    };
  }

  async joinUrl(roomId: string, participant: { displayName: string }) {
    return {
      url: `https://example.com/telehealth/${roomId}?name=${encodeURIComponent(participant.displayName)}`,
      expiresInSeconds: 3600,
    };
  }

  async endRoom(_roomId: string) {
    // No-op for stub
  }

  async healthCheck() {
    return true; // Stub is always "healthy"
  }
}

/* ------------------------------------------------------------------ */
/* Registry                                                             */
/* ------------------------------------------------------------------ */

const PROVIDERS: Record<string, () => TelehealthProvider> = {
  jitsi: () => new JitsiProvider(),
  stub: () => new StubProvider(),
  // Future:
  // zoom: () => new ZoomProvider(),
  // twilio: () => new TwilioProvider(),
  // webex: () => new WebExProvider(),
};

let _instance: TelehealthProvider | null = null;

/**
 * Get the configured telehealth provider singleton.
 * Reads TELEHEALTH_PROVIDER env var (default: "jitsi").
 */
export function getTelehealthProvider(): TelehealthProvider {
  if (_instance) return _instance;

  const providerName = (process.env.TELEHEALTH_PROVIDER || 'jitsi').toLowerCase();
  const factory = PROVIDERS[providerName];

  if (!factory) {
    const available = Object.keys(PROVIDERS).join(', ');
    throw new Error(`Unknown telehealth provider "${providerName}". Available: ${available}`);
  }

  _instance = factory();
  return _instance;
}

/**
 * List available provider names.
 */
export function listProviders(): string[] {
  return Object.keys(PROVIDERS);
}

/**
 * Reset provider singleton (for testing).
 */
export function resetProvider(): void {
  _instance = null;
}
