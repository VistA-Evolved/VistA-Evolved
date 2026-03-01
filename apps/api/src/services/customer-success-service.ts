/**
 * Customer Success Tooling Service (Phase 372 / W20-P3)
 *
 * Provides:
 * - Tenant onboarding automation (pack, country, region, config)
 * - Training mode toggle (synthetic data seeding, UI banner flag)
 * - Demo environment generator (test-ready datasets)
 * - Onboarding progress tracking
 *
 * All stores are in-memory with PG migration targets documented.
 */

import crypto from "node:crypto";

/* ================================================================== */
/* Types                                                               */
/* ================================================================== */

export type OnboardingStatus =
  | "pending"
  | "provisioning"
  | "configuring"
  | "seeding"
  | "ready"
  | "failed";

export type TrainingMode = "off" | "active" | "demo";

export interface TenantOnboardingConfig {
  id: string;
  tenantId: string;
  tenantName: string;
  pack: string;
  country: string;
  region: string;
  status: OnboardingStatus;
  trainingMode: TrainingMode;
  modules: string[];
  adminEmail: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  steps: OnboardingStep[];
}

export interface OnboardingStep {
  name: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  completedAt: string | null;
  error: string | null;
}

export interface SyntheticDataset {
  id: string;
  tenantId: string;
  type: "patients" | "encounters" | "orders" | "labs" | "vitals" | "full_demo";
  recordCount: number;
  seededAt: string;
  metadata: Record<string, unknown>;
}

export interface DemoEnvironment {
  id: string;
  tenantId: string;
  name: string;
  status: "creating" | "ready" | "expired" | "destroyed";
  expiresAt: string;
  datasets: SyntheticDataset[];
  createdAt: string;
}

/* ================================================================== */
/* Stores                                                              */
/* ================================================================== */

const onboardingStore = new Map<string, TenantOnboardingConfig>();
const datasetStore = new Map<string, SyntheticDataset>();
const demoEnvStore = new Map<string, DemoEnvironment>();

const MAX_STORE_SIZE = 5_000;

function uid(): string {
  return crypto.randomBytes(12).toString("hex");
}

function now(): string {
  return new Date().toISOString();
}

function boundedSet<T>(store: Map<string, T>, key: string, value: T): void {
  if (store.size >= MAX_STORE_SIZE) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(key, value);
}

/* ================================================================== */
/* Onboarding Steps Template                                           */
/* ================================================================== */

const ONBOARDING_STEPS: string[] = [
  "provision_tenant",
  "configure_modules",
  "load_country_pack",
  "seed_reference_data",
  "configure_security",
  "verify_connectivity",
  "enable_monitoring",
  "send_welcome_email",
];

function createSteps(): OnboardingStep[] {
  return ONBOARDING_STEPS.map((name) => ({
    name,
    status: "pending" as const,
    completedAt: null,
    error: null,
  }));
}

/* ================================================================== */
/* Tenant Onboarding                                                   */
/* ================================================================== */

export function startOnboarding(input: {
  tenantName: string;
  pack: string;
  country: string;
  region: string;
  modules?: string[];
  adminEmail?: string;
}): TenantOnboardingConfig {
  const tenantId = `tenant-${uid().slice(0, 8)}`;
  const config: TenantOnboardingConfig = {
    id: uid(),
    tenantId,
    tenantName: input.tenantName,
    pack: input.pack,
    country: input.country,
    region: input.region,
    status: "pending",
    trainingMode: "off",
    modules: input.modules || ["clinical", "scheduling", "rcm"],
    adminEmail: input.adminEmail || "",
    createdAt: now(),
    updatedAt: now(),
    completedAt: null,
    steps: createSteps(),
  };
  boundedSet(onboardingStore, config.id, config);
  return config;
}

export function runOnboarding(id: string): TenantOnboardingConfig | null {
  const config = onboardingStore.get(id);
  if (!config) return null;

  // Simulate each step completing
  const updated: TenantOnboardingConfig = {
    ...config,
    status: "provisioning",
    updatedAt: now(),
    steps: config.steps.map((step) => ({
      ...step,
      status: "completed" as const,
      completedAt: now(),
    })),
  };
  updated.status = "ready";
  updated.completedAt = now();
  onboardingStore.set(id, updated);
  return updated;
}

export function getOnboarding(id: string): TenantOnboardingConfig | undefined {
  return onboardingStore.get(id);
}

export function listOnboardings(): TenantOnboardingConfig[] {
  return [...onboardingStore.values()];
}

/* ================================================================== */
/* Training Mode                                                       */
/* ================================================================== */

export function enableTrainingMode(onboardingId: string): TenantOnboardingConfig | null {
  const config = onboardingStore.get(onboardingId);
  if (!config) return null;
  const updated: TenantOnboardingConfig = {
    ...config,
    trainingMode: "active",
    updatedAt: now(),
  };
  onboardingStore.set(onboardingId, updated);

  // Auto-seed synthetic data
  seedSyntheticDataset(config.tenantId, "full_demo", 50);

  return updated;
}

export function disableTrainingMode(onboardingId: string): TenantOnboardingConfig | null {
  const config = onboardingStore.get(onboardingId);
  if (!config) return null;
  const updated: TenantOnboardingConfig = {
    ...config,
    trainingMode: "off",
    updatedAt: now(),
  };
  onboardingStore.set(onboardingId, updated);
  return updated;
}

export function getTrainingStatus(tenantId: string): {
  trainingMode: TrainingMode;
  showBanner: boolean;
  datasets: SyntheticDataset[];
} {
  const config = [...onboardingStore.values()].find((c) => c.tenantId === tenantId);
  const datasets = [...datasetStore.values()].filter((d) => d.tenantId === tenantId);
  return {
    trainingMode: config?.trainingMode || "off",
    showBanner: config?.trainingMode === "active" || config?.trainingMode === "demo",
    datasets,
  };
}

/* ================================================================== */
/* Synthetic Dataset Seeding                                           */
/* ================================================================== */

export function seedSyntheticDataset(
  tenantId: string,
  type: SyntheticDataset["type"],
  recordCount: number
): SyntheticDataset {
  const ds: SyntheticDataset = {
    id: uid(),
    tenantId,
    type,
    recordCount,
    seededAt: now(),
    metadata: {
      generator: "customer-success-service",
      synthetic: true,
      description: `Synthetic ${type} dataset with ${recordCount} records`,
    },
  };
  boundedSet(datasetStore, ds.id, ds);
  return ds;
}

export function listDatasets(tenantId: string): SyntheticDataset[] {
  return [...datasetStore.values()].filter((d) => d.tenantId === tenantId);
}

/* ================================================================== */
/* Demo Environment                                                    */
/* ================================================================== */

export function createDemoEnvironment(
  tenantId: string,
  name: string,
  expiresInHours: number = 24
): DemoEnvironment {
  const datasets: SyntheticDataset[] = [
    seedSyntheticDataset(tenantId, "patients", 25),
    seedSyntheticDataset(tenantId, "encounters", 100),
    seedSyntheticDataset(tenantId, "orders", 50),
    seedSyntheticDataset(tenantId, "labs", 75),
    seedSyntheticDataset(tenantId, "vitals", 200),
  ];

  const env: DemoEnvironment = {
    id: uid(),
    tenantId,
    name,
    status: "ready",
    expiresAt: new Date(Date.now() + expiresInHours * 3600000).toISOString(),
    datasets,
    createdAt: now(),
  };
  boundedSet(demoEnvStore, env.id, env);
  return env;
}

export function getDemoEnvironment(id: string): DemoEnvironment | undefined {
  return demoEnvStore.get(id);
}

export function listDemoEnvironments(tenantId: string): DemoEnvironment[] {
  return [...demoEnvStore.values()].filter((e) => e.tenantId === tenantId);
}

export function destroyDemoEnvironment(id: string): DemoEnvironment | null {
  const env = demoEnvStore.get(id);
  if (!env) return null;
  const updated: DemoEnvironment = { ...env, status: "destroyed" };
  demoEnvStore.set(id, updated);
  return updated;
}
