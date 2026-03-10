/**
 * HL7v2 Message Packs -- Pack Registry
 *
 * Phase 241 (Wave 6 P4): Central registry for all message packs.
 * Provides lookup by ID or by message type.
 */

import type { MessagePack } from './types.js';
import { adtPack } from './adt-pack.js';
import { ormPack } from './orm-pack.js';
import { oruPack } from './oru-pack.js';
import { siuPack } from './siu-pack.js';

// Re-exports
export * from './types.js';
export {
  adtPack,
  buildAdtA01,
  buildAdtA02,
  buildAdtA03,
  buildAdtA08,
  validateAdtMessage,
} from './adt-pack.js';
export { ormPack, buildOrmO01, validateOrmMessage } from './orm-pack.js';
export { oruPack, buildOruR01, validateOruMessage } from './oru-pack.js';
export {
  siuPack,
  buildSiuS12,
  buildSiuS13,
  buildSiuS14,
  buildSiuS15,
  validateSiuMessage,
} from './siu-pack.js';

/* ------------------------------------------------------------------ */
/*  Pack Registry                                                      */
/* ------------------------------------------------------------------ */

const packRegistry = new Map<string, MessagePack>();

/** Register a pack. */
export function registerPack(pack: MessagePack): void {
  packRegistry.set(pack.id, pack);
}

/** Get a pack by ID. */
export function getPack(id: string): MessagePack | undefined {
  return packRegistry.get(id);
}

/** List all registered packs. */
export function listPacks(): MessagePack[] {
  return Array.from(packRegistry.values());
}

/** Find a pack by message type. */
export function findPackByMessageType(messageType: string): MessagePack | undefined {
  for (const pack of packRegistry.values()) {
    if (
      pack.messageTypes.some((t) => messageType.startsWith(t.split('^')[0]!) && messageType === t)
    ) {
      return pack;
    }
    // Also check wildcard: "ADT^*" style matching
    if (
      pack.messageTypes.some((t) => {
        const prefix = t.split('^')[0]!;
        return messageType.startsWith(prefix + '^');
      })
    ) {
      return pack;
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/*  Initialize built-in packs                                          */
/* ------------------------------------------------------------------ */

registerPack(adtPack);
registerPack(ormPack);
registerPack(oruPack);
registerPack(siuPack);
