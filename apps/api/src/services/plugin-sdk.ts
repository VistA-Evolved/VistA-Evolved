/**
 * Backend Plugin SDK — Phase 358 (W18-P5)
 *
 * Signed plugin manifests, extension points (event consumers, validators,
 * transformers), sandboxed execution with timeouts, and audit logging.
 *
 * ADR: ADR-PLUGIN-MODEL.md — signed manifests, extension points, React portals.
 */

import { randomBytes, createHash, createHmac } from "node:crypto";
import {
  registerConsumer,
  unregisterConsumer,
  type DomainEvent,
} from "./event-bus.js";

// ── Types ───────────────────────────────────────────────────────────────

export type PluginStatus =
  | "installed"
  | "active"
  | "suspended"
  | "uninstalled";

export type ExtensionPointType =
  | "event_consumer"
  | "validator"
  | "transformer"
  | "hook";

export interface PluginPermission {
  /** Resource the plugin can access */
  resource: string;
  /** Actions: read, write, subscribe, etc. */
  actions: string[];
}

export interface PluginManifest {
  /** Plugin unique identifier (reverse-domain: com.example.my-plugin) */
  pluginId: string;
  name: string;
  version: string;
  description: string;
  author: string;
  /** SHA-256 hash of the manifest JSON (excluding signature field) */
  contentHash: string;
  /** HMAC-SHA256 signature using the plugin signing secret */
  signature: string;
  /** Extension points this plugin hooks into */
  extensionPoints: ExtensionPointDeclaration[];
  /** Required permissions */
  permissions: PluginPermission[];
  /** Minimum API version compatibility */
  minApiVersion?: string;
}

export interface ExtensionPointDeclaration {
  type: ExtensionPointType;
  /** Target: event type pattern, validation stage, transform key */
  target: string;
  /** Handler function name or inline config */
  handlerName: string;
}

export interface InstalledPlugin {
  id: string;
  tenantId: string;
  manifest: PluginManifest;
  status: PluginStatus;
  /** Event bus consumer IDs registered by this plugin */
  consumerIds: string[];
  /** Execution stats */
  stats: {
    totalInvocations: number;
    totalErrors: number;
    lastInvokedAt?: string;
    lastErrorAt?: string;
  };
  installedAt: string;
  updatedAt: string;
  installedBy: string;
}

export interface PluginAuditEntry {
  id: string;
  tenantId: string;
  pluginId: string;
  action: string;
  actor: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

// ── Stores ──────────────────────────────────────────────────────────────

/** Installed plugins — keyed by composite "tenantId:pluginId" */
const plugins = new Map<string, InstalledPlugin>();

/** Plugin audit log — max 10K entries */
const auditLog: PluginAuditEntry[] = [];
const MAX_AUDIT = 10_000;

/** Validator registry — keyed by validation stage */
const validators = new Map<string, Array<{ pluginId: string; handler: (data: unknown) => Promise<{ valid: boolean; errors?: string[] }> }>>();

/** Transformer registry — keyed by transform key */
const transformers = new Map<string, Array<{ pluginId: string; handler: (data: unknown) => Promise<unknown> }>>();

// ── Plugin signing secret (env-configurable, default for dev) ────────
const PLUGIN_SIGNING_SECRET =
  process.env.PLUGIN_SIGNING_SECRET || "dev-plugin-signing-secret-change-me";

/** Execution timeout for plugin handlers (ms) */
const PLUGIN_TIMEOUT_MS = parseInt(
  process.env.PLUGIN_TIMEOUT_MS || "5000",
  10,
);

// ── Helpers ─────────────────────────────────────────────────────────────

function genId(): string {
  return randomBytes(16).toString("hex");
}

function now(): string {
  return new Date().toISOString();
}

function pluginKey(tenantId: string, pluginId: string): string {
  return `${tenantId}:${pluginId}`;
}

/**
 * Compute the content hash of a manifest (excluding signature field).
 */
export function computeManifestHash(manifest: Omit<PluginManifest, "contentHash" | "signature">): string {
  const sorted = JSON.stringify(manifest, Object.keys(manifest).sort());
  return createHash("sha256").update(sorted).digest("hex");
}

/**
 * Sign a manifest content hash with the plugin signing secret.
 */
export function signManifest(contentHash: string): string {
  return createHmac("sha256", PLUGIN_SIGNING_SECRET)
    .update(contentHash)
    .digest("hex");
}

/**
 * Verify a plugin manifest signature.
 */
export function verifyManifestSignature(manifest: PluginManifest): boolean {
  const expected = signManifest(manifest.contentHash);
  if (expected.length !== manifest.signature.length) return false;
  // Constant-time comparison
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ manifest.signature.charCodeAt(i);
  }
  return diff === 0;
}

function logAudit(
  tenantId: string,
  pluginId: string,
  action: string,
  actor: string,
  detail: Record<string, unknown>,
): void {
  auditLog.push({
    id: genId(),
    tenantId,
    pluginId,
    action,
    actor,
    detail,
    createdAt: now(),
  });
  if (auditLog.length > MAX_AUDIT) {
    auditLog.splice(0, auditLog.length - MAX_AUDIT);
  }
}

/**
 * Execute a handler with a timeout. Returns result or throws on timeout.
 */
async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Plugin handler timeout (${timeoutMs}ms): ${label}`)),
      timeoutMs,
    );
    fn()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ── Plugin Lifecycle ────────────────────────────────────────────────────

export function installPlugin(
  tenantId: string,
  manifest: PluginManifest,
  actor: string,
): InstalledPlugin {
  // Verify signature
  if (!verifyManifestSignature(manifest)) {
    throw new Error("Invalid plugin signature. Plugin manifest has been tampered with.");
  }

  const key = pluginKey(tenantId, manifest.pluginId);
  if (plugins.has(key)) {
    throw new Error(`Plugin ${manifest.pluginId} is already installed for tenant ${tenantId}`);
  }

  const plugin: InstalledPlugin = {
    id: genId(),
    tenantId,
    manifest,
    status: "installed",
    consumerIds: [],
    stats: { totalInvocations: 0, totalErrors: 0 },
    installedAt: now(),
    updatedAt: now(),
    installedBy: actor,
  };

  plugins.set(key, plugin);
  logAudit(tenantId, manifest.pluginId, "install", actor, {
    version: manifest.version,
    extensionPoints: manifest.extensionPoints.length,
  });

  return plugin;
}

export function activatePlugin(
  tenantId: string,
  pluginId: string,
  actor: string,
): InstalledPlugin {
  const key = pluginKey(tenantId, pluginId);
  const plugin = plugins.get(key);
  if (!plugin) throw new Error(`Plugin ${pluginId} not found`);
  if (plugin.status === "active") return plugin;

  // Register event consumers declared in manifest
  for (const ep of plugin.manifest.extensionPoints) {
    if (ep.type === "event_consumer") {
      const consumerId = `plugin-${pluginId}-${ep.target}`;
      registerConsumer({
        id: consumerId,
        name: `Plugin: ${plugin.manifest.name} → ${ep.target}`,
        handler: async (event: DomainEvent) => {
          plugin.stats.totalInvocations++;
          plugin.stats.lastInvokedAt = now();
          // Sandbox: log the invocation. Real handler would be loaded from plugin code.
          logAudit(tenantId, pluginId, "event_handled", "system", {
            eventType: event.eventType,
            eventId: event.eventId,
          });
        },
        eventFilters: [ep.target],
        tenantIds: [tenantId],
      });
      plugin.consumerIds.push(consumerId);
    }
  }

  plugin.status = "active";
  plugin.updatedAt = now();
  logAudit(tenantId, pluginId, "activate", actor, { consumerIds: plugin.consumerIds });
  return plugin;
}

export function suspendPlugin(
  tenantId: string,
  pluginId: string,
  actor: string,
  reason?: string,
): InstalledPlugin {
  const key = pluginKey(tenantId, pluginId);
  const plugin = plugins.get(key);
  if (!plugin) throw new Error(`Plugin ${pluginId} not found`);

  // Unregister event consumers
  for (const cid of plugin.consumerIds) {
    unregisterConsumer(cid);
  }
  plugin.consumerIds = [];

  plugin.status = "suspended";
  plugin.updatedAt = now();
  logAudit(tenantId, pluginId, "suspend", actor, { reason: reason || "manual" });
  return plugin;
}

export function uninstallPlugin(
  tenantId: string,
  pluginId: string,
  actor: string,
): boolean {
  const key = pluginKey(tenantId, pluginId);
  const plugin = plugins.get(key);
  if (!plugin) return false;

  // Unregister event consumers
  for (const cid of plugin.consumerIds) {
    unregisterConsumer(cid);
  }

  // Remove validators and transformers from this plugin
  for (const [stage, vals] of validators) {
    validators.set(stage, vals.filter((v) => v.pluginId !== pluginId));
  }
  for (const [key, trs] of transformers) {
    transformers.set(key, trs.filter((t) => t.pluginId !== pluginId));
  }

  plugins.delete(key);
  logAudit(tenantId, pluginId, "uninstall", actor, {});
  return true;
}

// ── Extension Point Registration (programmatic for in-process plugins) ─

export function registerValidator(
  pluginId: string,
  stage: string,
  handler: (data: unknown) => Promise<{ valid: boolean; errors?: string[] }>,
): void {
  if (!validators.has(stage)) validators.set(stage, []);
  validators.get(stage)!.push({ pluginId, handler });
}

export function registerTransformer(
  pluginId: string,
  transformKey: string,
  handler: (data: unknown) => Promise<unknown>,
): void {
  if (!transformers.has(transformKey)) transformers.set(transformKey, []);
  transformers.get(transformKey)!.push({ pluginId, handler });
}

/**
 * Run all validators for a given stage. Returns combined result.
 */
export async function runValidators(
  stage: string,
  data: unknown,
): Promise<{ valid: boolean; errors: string[] }> {
  const stageValidators = validators.get(stage);
  if (!stageValidators || stageValidators.length === 0) {
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];
  for (const v of stageValidators) {
    try {
      const result = await withTimeout(
        () => v.handler(data),
        PLUGIN_TIMEOUT_MS,
        `validator:${stage}:${v.pluginId}`,
      );
      if (!result.valid && result.errors) {
        errors.push(...result.errors);
      }
    } catch (err: any) {
      errors.push(`Validator ${v.pluginId} failed: ${err.message}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Run all transformers for a given key in sequence (pipeline).
 */
export async function runTransformers(
  transformKey: string,
  data: unknown,
): Promise<unknown> {
  const keyTransformers = transformers.get(transformKey);
  if (!keyTransformers || keyTransformers.length === 0) {
    return data;
  }

  let result = data;
  for (const t of keyTransformers) {
    try {
      result = await withTimeout(
        () => t.handler(result),
        PLUGIN_TIMEOUT_MS,
        `transformer:${transformKey}:${t.pluginId}`,
      );
    } catch (err: any) {
      // On transformer failure, pass through unchanged
      break;
    }
  }
  return result;
}

// ── Query Helpers ───────────────────────────────────────────────────────

export function getPlugin(
  tenantId: string,
  pluginId: string,
): InstalledPlugin | undefined {
  return plugins.get(pluginKey(tenantId, pluginId));
}

export function listPlugins(
  tenantId: string,
  opts?: { status?: PluginStatus },
): InstalledPlugin[] {
  const result: InstalledPlugin[] = [];
  for (const p of plugins.values()) {
    if (p.tenantId !== tenantId) continue;
    if (opts?.status && p.status !== opts.status) continue;
    result.push(p);
  }
  return result;
}

export function getPluginAudit(
  tenantId: string,
  opts?: { pluginId?: string; limit?: number },
): PluginAuditEntry[] {
  const limit = opts?.limit ?? 100;
  const result: PluginAuditEntry[] = [];
  for (let i = auditLog.length - 1; i >= 0 && result.length < limit; i--) {
    const e = auditLog[i];
    if (e.tenantId !== tenantId) continue;
    if (opts?.pluginId && e.pluginId !== opts.pluginId) continue;
    result.push(e);
  }
  return result;
}

export function getPluginStats(tenantId: string): {
  totalPlugins: number;
  activePlugins: number;
  totalValidators: number;
  totalTransformers: number;
  totalAuditEntries: number;
  extensionPointTypes: ExtensionPointType[];
} {
  let total = 0;
  let active = 0;
  for (const p of plugins.values()) {
    if (p.tenantId !== tenantId) continue;
    total++;
    if (p.status === "active") active++;
  }

  let valCount = 0;
  for (const vals of validators.values()) valCount += vals.length;
  let trCount = 0;
  for (const trs of transformers.values()) trCount += trs.length;

  let auditCount = 0;
  for (const e of auditLog) if (e.tenantId === tenantId) auditCount++;

  return {
    totalPlugins: total,
    activePlugins: active,
    totalValidators: valCount,
    totalTransformers: trCount,
    totalAuditEntries: auditCount,
    extensionPointTypes: ["event_consumer", "validator", "transformer", "hook"],
  };
}

// ── Reset (testing) ─────────────────────────────────────────────────────

export function _resetPluginSdk(): void {
  for (const p of plugins.values()) {
    for (const cid of p.consumerIds) {
      unregisterConsumer(cid);
    }
  }
  plugins.clear();
  auditLog.length = 0;
  validators.clear();
  transformers.clear();
}
