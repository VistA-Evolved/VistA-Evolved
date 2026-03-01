/**
 * Department Pack Service — Phase 349
 *
 * Loads department pack manifests from config/packs/, manages installation
 * per tenant+department, and tracks installed packs in PG.
 *
 * ADR: docs/decisions/ADR-DEPARTMENT-PACKS-MODEL.md
 * Pattern: Config-driven JSON manifests — no dynamic code loading.
 */

import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ─── Types ───────────────────────────────────────────────

export interface DepartmentPack {
  id: string;
  name: string;
  version: string;
  description: string;
  departmentType: string;
  modules: string[];
  featureFlags: Record<string, boolean>;
  roleTemplates: string[];
  prerequisites: string[];
  countryPacks: string[];
  metadata: Record<string, unknown>;
}

export interface PackInstallation {
  id: string;
  tenantId: string;
  departmentId: string;
  packId: string;
  packVersion: string;
  status: "installed" | "pending" | "failed" | "uninstalled";
  installedBy: string;
  installedAt: string;
  uninstalledAt: string | null;
  flagOverrides: Record<string, boolean>;
  metadata: Record<string, unknown>;
}

export interface PackValidationResult {
  valid: boolean;
  packId: string;
  errors: string[];
  warnings: string[];
  missingPrerequisites: string[];
}

// ─── Pack Registry (loaded from config/) ─────────────────

const packRegistry = new Map<string, DepartmentPack>();
const installationStore = new Map<string, PackInstallation>();

/**
 * Load department packs from config/packs/department-packs.json.
 * Safe to call multiple times (idempotent).
 */
export function loadPackManifests(configDir?: string): DepartmentPack[] {
  const dir = configDir || join(process.cwd(), "..", "..", "config", "packs");
  const filePath = join(dir, "department-packs.json");

  if (!existsSync(filePath)) {
    return Array.from(packRegistry.values());
  }

  try {
    const raw = readFileSync(filePath, "utf-8");
    // Strip BOM (BUG-064)
    const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    const packs: DepartmentPack[] = JSON.parse(clean);
    for (const pack of packs) {
      packRegistry.set(pack.id, pack);
    }
    return packs;
  } catch {
    return Array.from(packRegistry.values());
  }
}

export function getPack(packId: string): DepartmentPack | undefined {
  return packRegistry.get(packId);
}

export function listPacks(departmentType?: string): DepartmentPack[] {
  const all = Array.from(packRegistry.values());
  if (!departmentType) return all;
  return all.filter((p) => p.departmentType === departmentType);
}

// ─── Pack Validation ─────────────────────────────────────

export function validatePack(
  packId: string,
  installedModules: string[] = [],
): PackValidationResult {
  const pack = packRegistry.get(packId);
  if (!pack) {
    return {
      valid: false,
      packId,
      errors: [`Pack '${packId}' not found in registry`],
      warnings: [],
      missingPrerequisites: [],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const missingPrereqs: string[] = [];

  // Check prerequisites
  for (const prereq of pack.prerequisites) {
    if (!installedModules.includes(prereq)) {
      missingPrereqs.push(prereq);
    }
  }
  if (missingPrereqs.length > 0) {
    errors.push(
      `Missing prerequisites: ${missingPrereqs.join(", ")}`,
    );
  }

  // Warn about country packs
  if (pack.countryPacks.length > 0) {
    warnings.push(
      `Pack references country packs: ${pack.countryPacks.join(", ")}`,
    );
  }

  return {
    valid: errors.length === 0,
    packId,
    errors,
    warnings,
    missingPrerequisites: missingPrereqs,
  };
}

// ─── Pack Installation ───────────────────────────────────

export function installPack(
  tenantId: string,
  departmentId: string,
  packId: string,
  installedBy: string,
  flagOverrides?: Record<string, boolean>,
): PackInstallation | { error: string } {
  const pack = packRegistry.get(packId);
  if (!pack) {
    return { error: `Pack '${packId}' not found` };
  }

  // Check for existing installation
  const existing = Array.from(installationStore.values()).find(
    (i) =>
      i.tenantId === tenantId &&
      i.departmentId === departmentId &&
      i.packId === packId &&
      i.status === "installed",
  );
  if (existing) {
    return { error: `Pack '${packId}' already installed in department '${departmentId}'` };
  }

  const installation: PackInstallation = {
    id: randomUUID(),
    tenantId,
    departmentId,
    packId,
    packVersion: pack.version,
    status: "installed",
    installedBy,
    installedAt: new Date().toISOString(),
    uninstalledAt: null,
    flagOverrides: flagOverrides || {},
    metadata: {},
  };
  installationStore.set(installation.id, installation);
  return installation;
}

export function uninstallPack(installationId: string): boolean {
  const inst = installationStore.get(installationId);
  if (!inst || inst.status !== "installed") return false;
  inst.status = "uninstalled";
  inst.uninstalledAt = new Date().toISOString();
  return true;
}

export function listInstallations(
  tenantId: string,
  departmentId?: string,
): PackInstallation[] {
  return Array.from(installationStore.values()).filter(
    (i) =>
      i.tenantId === tenantId &&
      i.status === "installed" &&
      (!departmentId || i.departmentId === departmentId),
  );
}

export function getInstallation(id: string): PackInstallation | undefined {
  return installationStore.get(id);
}

// ─── Effective Feature Flags ─────────────────────────────

/**
 * Resolve effective feature flags for a department by merging
 * all installed packs' flags with per-installation overrides.
 */
export function resolveEffectiveFlags(
  tenantId: string,
  departmentId: string,
): Record<string, boolean> {
  const installations = listInstallations(tenantId, departmentId);
  const flags: Record<string, boolean> = {};

  for (const inst of installations) {
    const pack = packRegistry.get(inst.packId);
    if (!pack) continue;

    // Base pack flags
    for (const [key, val] of Object.entries(pack.featureFlags)) {
      flags[key] = val;
    }

    // Per-installation overrides win
    for (const [key, val] of Object.entries(inst.flagOverrides)) {
      flags[key] = val;
    }
  }

  return flags;
}

// ─── Store Reset ─────────────────────────────────────────

export function _resetPackStores(): void {
  packRegistry.clear();
  installationStore.clear();
}
