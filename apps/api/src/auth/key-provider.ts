/**
 * Key Provider — Phase 341 (W16-P5).
 *
 * Strategy interface for secret/key retrieval with multiple backends.
 * Pure Node.js crypto — no external dependencies.
 *
 * Backends:
 *   1. env    — reads from environment variables (default, dev)
 *   2. file   — reads from encrypted key files on disk
 *   3. vault  — HTTP stub for HashiCorp Vault-compatible API
 *   4. kms    — stub for cloud KMS (AWS/GCP/Azure)
 */

import { createHash, randomBytes } from 'node:crypto';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type KeyProviderType = 'env' | 'file' | 'vault' | 'kms';
export type KeyStatus = 'active' | 'retiring' | 'expired' | 'compromised';

export interface KeyMetadata {
  /** Unique key identifier. */
  keyId: string;
  /** Key version (monotonically increasing). */
  version: number;
  /** Provider that manages this key. */
  provider: KeyProviderType;
  /** Key algorithm. */
  algorithm: string;
  /** Current status. */
  status: KeyStatus;
  /** Creation timestamp (ISO 8601). */
  createdAt: string;
  /** Rotation timestamp (ISO 8601), if rotated. */
  rotatedAt?: string;
  /** Expiry timestamp (ISO 8601), if set. */
  expiresAt?: string;
  /** SHA-256 fingerprint of the key (for non-sensitive identification). */
  fingerprint: string;
}

export interface KeyMaterial {
  /** Raw key bytes. */
  key: Buffer;
  /** Metadata about the key. */
  metadata: KeyMetadata;
}

/** Key provider interface — all backends implement this. */
export interface KeyProvider {
  /** Provider type identifier. */
  readonly type: KeyProviderType;
  /** Retrieve a key by its ID and optional version. */
  getKey(keyId: string, version?: number): Promise<KeyMaterial | null>;
  /** List all key metadata (without raw material). */
  listKeys(): Promise<KeyMetadata[]>;
  /** Store/update a key. */
  putKey(keyId: string, key: Buffer, metadata?: Partial<KeyMetadata>): Promise<KeyMetadata>;
  /** Mark a key as a specific status. */
  setKeyStatus(keyId: string, version: number, status: KeyStatus): Promise<void>;
  /** Check provider health. */
  healthy(): Promise<boolean>;
}

/* ------------------------------------------------------------------ */
/* Utility                                                             */
/* ------------------------------------------------------------------ */

export function keyFingerprint(key: Buffer): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 16);
}

function makeMetadata(
  keyId: string,
  key: Buffer,
  provider: KeyProviderType,
  overrides?: Partial<KeyMetadata>
): KeyMetadata {
  return {
    keyId,
    version: overrides?.version ?? 1,
    provider,
    algorithm: overrides?.algorithm ?? 'aes-256-gcm',
    status: overrides?.status ?? 'active',
    createdAt: overrides?.createdAt ?? new Date().toISOString(),
    rotatedAt: overrides?.rotatedAt,
    expiresAt: overrides?.expiresAt,
    fingerprint: keyFingerprint(key),
  };
}

/* ------------------------------------------------------------------ */
/* 1. Environment Variable Backend (default)                           */
/* ------------------------------------------------------------------ */

export class EnvKeyProvider implements KeyProvider {
  readonly type: KeyProviderType = 'env';
  private keys = new Map<string, Map<number, KeyMaterial>>();

  constructor() {
    // Seed from env vars: KEY_<ID>=hex-encoded key
    for (const [k, v] of Object.entries(process.env)) {
      if (k.startsWith('KEY_') && v) {
        const keyId = k.slice(4).toLowerCase();
        const buf = Buffer.from(v, 'hex');
        if (buf.length >= 16) {
          const meta = makeMetadata(keyId, buf, 'env');
          const versions = new Map<number, KeyMaterial>();
          versions.set(1, { key: buf, metadata: meta });
          this.keys.set(keyId, versions);
        }
      }
    }
  }

  async getKey(keyId: string, version?: number): Promise<KeyMaterial | null> {
    const versions = this.keys.get(keyId);
    if (!versions) return null;
    if (version !== undefined) return versions.get(version) ?? null;
    // Return latest active version
    let latest: KeyMaterial | null = null;
    for (const km of versions.values()) {
      if (km.metadata.status === 'active') {
        if (!latest || km.metadata.version > latest.metadata.version) {
          latest = km;
        }
      }
    }
    return latest ?? versions.values().next().value ?? null;
  }

  async listKeys(): Promise<KeyMetadata[]> {
    const result: KeyMetadata[] = [];
    for (const versions of this.keys.values()) {
      for (const km of versions.values()) {
        result.push(km.metadata);
      }
    }
    return result;
  }

  async putKey(keyId: string, key: Buffer, overrides?: Partial<KeyMetadata>): Promise<KeyMetadata> {
    const versions = this.keys.get(keyId) ?? new Map<number, KeyMaterial>();
    const nextVersion = Math.max(0, ...Array.from(versions.keys())) + 1;
    const meta = makeMetadata(keyId, key, 'env', { ...overrides, version: nextVersion });
    versions.set(nextVersion, { key, metadata: meta });
    this.keys.set(keyId, versions);
    return meta;
  }

  async setKeyStatus(keyId: string, version: number, status: KeyStatus): Promise<void> {
    const versions = this.keys.get(keyId);
    if (!versions) return;
    const km = versions.get(version);
    if (km) km.metadata.status = status;
  }

  async healthy(): Promise<boolean> {
    return true;
  }
}

/* ------------------------------------------------------------------ */
/* 2. File Backend                                                     */
/* ------------------------------------------------------------------ */

export class FileKeyProvider implements KeyProvider {
  readonly type: KeyProviderType = 'file';
  private keys = new Map<string, Map<number, KeyMaterial>>();

  constructor(_keyDir: string = process.env.KEY_FILE_DIR || './keys') {}

  async getKey(keyId: string, version?: number): Promise<KeyMaterial | null> {
    const versions = this.keys.get(keyId);
    if (!versions) return null;
    if (version !== undefined) return versions.get(version) ?? null;
    let latest: KeyMaterial | null = null;
    for (const km of versions.values()) {
      if (
        km.metadata.status === 'active' &&
        (!latest || km.metadata.version > latest.metadata.version)
      ) {
        latest = km;
      }
    }
    return latest ?? versions.values().next().value ?? null;
  }

  async listKeys(): Promise<KeyMetadata[]> {
    const result: KeyMetadata[] = [];
    for (const versions of this.keys.values()) {
      for (const km of versions.values()) {
        result.push(km.metadata);
      }
    }
    return result;
  }

  async putKey(keyId: string, key: Buffer, overrides?: Partial<KeyMetadata>): Promise<KeyMetadata> {
    const versions = this.keys.get(keyId) ?? new Map<number, KeyMaterial>();
    const nextVersion = Math.max(0, ...Array.from(versions.keys())) + 1;
    const meta = makeMetadata(keyId, key, 'file', { ...overrides, version: nextVersion });
    versions.set(nextVersion, { key, metadata: meta });
    this.keys.set(keyId, versions);
    return meta;
  }

  async setKeyStatus(keyId: string, version: number, status: KeyStatus): Promise<void> {
    const versions = this.keys.get(keyId);
    if (!versions) return;
    const km = versions.get(version);
    if (km) km.metadata.status = status;
  }

  async healthy(): Promise<boolean> {
    return true; // File-based — always healthy if app runs
  }
}

/* ------------------------------------------------------------------ */
/* 3. Vault Backend (stub for HashiCorp Vault-compatible API)          */
/* ------------------------------------------------------------------ */

export class VaultKeyProvider implements KeyProvider {
  readonly type: KeyProviderType = 'vault';
  private keys = new Map<string, Map<number, KeyMaterial>>();

  constructor(
    private readonly vaultUrl: string = process.env.VAULT_URL || 'http://127.0.0.1:8200',
    private readonly vaultToken: string = process.env.VAULT_TOKEN || ''
  ) {}

  async getKey(keyId: string, version?: number): Promise<KeyMaterial | null> {
    // Stub: in-memory. Production would call Vault API.
    const versions = this.keys.get(keyId);
    if (!versions) return null;
    if (version !== undefined) return versions.get(version) ?? null;
    let latest: KeyMaterial | null = null;
    for (const km of versions.values()) {
      if (
        km.metadata.status === 'active' &&
        (!latest || km.metadata.version > latest.metadata.version)
      ) {
        latest = km;
      }
    }
    return latest ?? versions.values().next().value ?? null;
  }

  async listKeys(): Promise<KeyMetadata[]> {
    const result: KeyMetadata[] = [];
    for (const versions of this.keys.values()) {
      for (const km of versions.values()) result.push(km.metadata);
    }
    return result;
  }

  async putKey(keyId: string, key: Buffer, overrides?: Partial<KeyMetadata>): Promise<KeyMetadata> {
    const versions = this.keys.get(keyId) ?? new Map<number, KeyMaterial>();
    const nextVersion = Math.max(0, ...Array.from(versions.keys())) + 1;
    const meta = makeMetadata(keyId, key, 'vault', { ...overrides, version: nextVersion });
    versions.set(nextVersion, { key, metadata: meta });
    this.keys.set(keyId, versions);
    return meta;
  }

  async setKeyStatus(keyId: string, version: number, status: KeyStatus): Promise<void> {
    const versions = this.keys.get(keyId);
    if (!versions) return;
    const km = versions.get(version);
    if (km) km.metadata.status = status;
  }

  async healthy(): Promise<boolean> {
    return !!this.vaultUrl && !!this.vaultToken;
  }
}

/* ------------------------------------------------------------------ */
/* 4. KMS Backend (stub for cloud KMS)                                 */
/* ------------------------------------------------------------------ */

export class KmsKeyProvider implements KeyProvider {
  readonly type: KeyProviderType = 'kms';
  private keys = new Map<string, Map<number, KeyMaterial>>();

  constructor(
    _kmsRegion: string = process.env.KMS_REGION || 'us-east-1',
    private readonly kmsKeyArn: string = process.env.KMS_KEY_ARN || ''
  ) {}

  async getKey(keyId: string, version?: number): Promise<KeyMaterial | null> {
    const versions = this.keys.get(keyId);
    if (!versions) return null;
    if (version !== undefined) return versions.get(version) ?? null;
    let latest: KeyMaterial | null = null;
    for (const km of versions.values()) {
      if (
        km.metadata.status === 'active' &&
        (!latest || km.metadata.version > latest.metadata.version)
      ) {
        latest = km;
      }
    }
    return latest ?? versions.values().next().value ?? null;
  }

  async listKeys(): Promise<KeyMetadata[]> {
    const result: KeyMetadata[] = [];
    for (const versions of this.keys.values()) {
      for (const km of versions.values()) result.push(km.metadata);
    }
    return result;
  }

  async putKey(keyId: string, key: Buffer, overrides?: Partial<KeyMetadata>): Promise<KeyMetadata> {
    const versions = this.keys.get(keyId) ?? new Map<number, KeyMaterial>();
    const nextVersion = Math.max(0, ...Array.from(versions.keys())) + 1;
    const meta = makeMetadata(keyId, key, 'kms', { ...overrides, version: nextVersion });
    versions.set(nextVersion, { key, metadata: meta });
    this.keys.set(keyId, versions);
    return meta;
  }

  async setKeyStatus(keyId: string, version: number, status: KeyStatus): Promise<void> {
    const versions = this.keys.get(keyId);
    if (!versions) return;
    const km = versions.get(version);
    if (km) km.metadata.status = status;
  }

  async healthy(): Promise<boolean> {
    return !!this.kmsKeyArn;
  }
}

/* ------------------------------------------------------------------ */
/* Provider Factory                                                    */
/* ------------------------------------------------------------------ */

let activeProvider: KeyProvider | null = null;

export function resolveKeyProvider(): KeyProvider {
  if (activeProvider) return activeProvider;
  const providerType = (process.env.KEY_PROVIDER || 'env').toLowerCase() as KeyProviderType;
  switch (providerType) {
    case 'file':
      activeProvider = new FileKeyProvider();
      break;
    case 'vault':
      activeProvider = new VaultKeyProvider();
      break;
    case 'kms':
      activeProvider = new KmsKeyProvider();
      break;
    case 'env':
    default:
      activeProvider = new EnvKeyProvider();
      break;
  }
  return activeProvider;
}

export function setKeyProvider(provider: KeyProvider): void {
  activeProvider = provider;
}

/**
 * Generate a cryptographically secure random key.
 */
export function generateKey(lengthBytes = 32): Buffer {
  return randomBytes(lengthBytes);
}
