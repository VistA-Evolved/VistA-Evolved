/**
 * Payer Dossier Repository (PostgreSQL) -- CRUD for dossier + onboarding tasks
 *
 * Phase 514 (Wave 37 B2): Payer Dossiers + Ops Onboarding Workflow
 *
 * Convention: every write audits to payerAuditEvent with entity_type "dossier"
 * or "onboarding_task". Optimistic concurrency via version column.
 */

import { randomUUID } from 'node:crypto';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { payerDossier, payerOnboardingTask, payerAuditEvent } from '../pg-schema.js';

/* -- Inferred types ---------------------------------------- */

export type DossierRow = typeof payerDossier.$inferSelect;
export type DossierInsert = typeof payerDossier.$inferInsert;
export type OnboardingTaskRow = typeof payerOnboardingTask.$inferSelect;
export type OnboardingTaskInsert = typeof payerOnboardingTask.$inferInsert;

/* -- Dossier CRUD ----------------------------------------- */

export async function findDossierById(id: string, tenantId?: string): Promise<DossierRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(payerDossier)
    .where(
      tenantId
        ? and(eq(payerDossier.id, id), eq(payerDossier.tenantId, tenantId))
        : eq(payerDossier.id, id)
    );
  return rows[0];
}

export async function findDossierByPayer(
  tenantId: string,
  payerId: string
): Promise<DossierRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(payerDossier)
    .where(and(eq(payerDossier.tenantId, tenantId), eq(payerDossier.payerId, payerId)));
  return rows[0];
}

export async function listDossiers(
  tenantId: string,
  filters?: {
    status?: string;
    countryCode?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ rows: DossierRow[]; total: number }> {
  const db = getPgDb();
  const conditions: ReturnType<typeof eq>[] = [eq(payerDossier.tenantId, tenantId)];

  if (filters?.status) conditions.push(eq(payerDossier.status, filters.status));
  if (filters?.countryCode) conditions.push(eq(payerDossier.countryCode, filters.countryCode));

  const where = conditions.length > 1 ? and(...conditions) : conditions[0];
  const limit = filters?.limit ?? 100;
  const offset = filters?.offset ?? 0;

  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(payerDossier)
      .where(where)
      .orderBy(desc(payerDossier.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(payerDossier)
      .where(where),
  ]);

  return { rows, total: count };
}

export async function insertDossier(
  data: Omit<DossierInsert, 'id' | 'createdAt' | 'updatedAt'>,
  reason: string,
  actor?: string
): Promise<DossierRow> {
  const db = getPgDb();
  const id = `dos_${randomUUID().slice(0, 12)}`;
  const now = new Date();

  const [created] = await db
    .insert(payerDossier)
    .values({ ...data, id, createdAt: now, updatedAt: now })
    .returning();

  await db.insert(payerAuditEvent).values({
    id: randomUUID(),
    tenantId: data.tenantId,
    actorType: actor ? 'user' : 'system',
    actorId: actor ?? 'system',
    entityType: 'dossier',
    entityId: id,
    action: 'create',
    beforeJson: null,
    afterJson: created,
    reason,
  });

  return created;
}

export async function updateDossier(
  id: string,
  tenantId: string,
  updates: Partial<DossierInsert>,
  reason: string,
  actor?: string,
  expectedVersion?: number
): Promise<DossierRow> {
  const db = getPgDb();

  const [before] = await db
    .select()
    .from(payerDossier)
    .where(and(eq(payerDossier.id, id), eq(payerDossier.tenantId, tenantId)));
  if (!before) throw Object.assign(new Error('Dossier not found'), { statusCode: 404 });

  if (expectedVersion !== undefined && before.version !== expectedVersion) {
    throw Object.assign(new Error('CONCURRENCY_CONFLICT'), { statusCode: 409 });
  }

  const [updated] = await db
    .update(payerDossier)
    .set({
      ...updates,
      version: sql`COALESCE(${payerDossier.version}, 1) + 1`,
      updatedAt: new Date(),
      updatedBy: actor,
    })
    .where(and(eq(payerDossier.id, id), eq(payerDossier.tenantId, tenantId)))
    .returning();

  await db.insert(payerAuditEvent).values({
    id: randomUUID(),
    tenantId: before.tenantId,
    actorType: actor ? 'user' : 'system',
    actorId: actor ?? 'system',
    entityType: 'dossier',
    entityId: id,
    action: 'update',
    beforeJson: before,
    afterJson: updated,
    reason,
  });

  return updated;
}

/* -- Onboarding Task CRUD --------------------------------- */

export async function listOnboardingTasks(
  dossierId: string,
  tenantId?: string
): Promise<OnboardingTaskRow[]> {
  const db = getPgDb();
  return db
    .select()
    .from(payerOnboardingTask)
    .where(
      tenantId
        ? and(eq(payerOnboardingTask.dossierId, dossierId), eq(payerOnboardingTask.tenantId, tenantId))
        : eq(payerOnboardingTask.dossierId, dossierId)
    )
    .orderBy(payerOnboardingTask.sortOrder);
}

export async function findOnboardingTaskById(
  id: string,
  tenantId?: string
): Promise<OnboardingTaskRow | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(payerOnboardingTask)
    .where(
      tenantId
        ? and(eq(payerOnboardingTask.id, id), eq(payerOnboardingTask.tenantId, tenantId))
        : eq(payerOnboardingTask.id, id)
    );
  return rows[0];
}

export async function insertOnboardingTask(
  data: Omit<OnboardingTaskInsert, 'id' | 'createdAt' | 'updatedAt'>,
  reason: string,
  actor?: string
): Promise<OnboardingTaskRow> {
  const db = getPgDb();
  const id = `otask_${randomUUID().slice(0, 12)}`;
  const now = new Date();

  const [created] = await db
    .insert(payerOnboardingTask)
    .values({ ...data, id, createdAt: now, updatedAt: now })
    .returning();

  await db.insert(payerAuditEvent).values({
    id: randomUUID(),
    tenantId: data.tenantId,
    actorType: actor ? 'user' : 'system',
    actorId: actor ?? 'system',
    entityType: 'onboarding_task',
    entityId: id,
    action: 'create',
    beforeJson: null,
    afterJson: created,
    reason,
  });

  return created;
}

export async function updateOnboardingTask(
  id: string,
  tenantId: string,
  updates: Partial<OnboardingTaskInsert>,
  reason: string,
  actor?: string,
  expectedVersion?: number
): Promise<OnboardingTaskRow> {
  const db = getPgDb();

  const [before] = await db
    .select()
    .from(payerOnboardingTask)
    .where(and(eq(payerOnboardingTask.id, id), eq(payerOnboardingTask.tenantId, tenantId)));
  if (!before) throw Object.assign(new Error('Onboarding task not found'), { statusCode: 404 });

  if (expectedVersion !== undefined && before.version !== expectedVersion) {
    throw Object.assign(new Error('CONCURRENCY_CONFLICT'), { statusCode: 409 });
  }

  const [updated] = await db
    .update(payerOnboardingTask)
    .set({
      ...updates,
      version: sql`COALESCE(${payerOnboardingTask.version}, 1) + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(payerOnboardingTask.id, id), eq(payerOnboardingTask.tenantId, tenantId)))
    .returning();

  await db.insert(payerAuditEvent).values({
    id: randomUUID(),
    tenantId: before.tenantId,
    actorType: actor ? 'user' : 'system',
    actorId: actor ?? 'system',
    entityType: 'onboarding_task',
    entityId: id,
    action: 'update',
    beforeJson: before,
    afterJson: updated,
    reason,
  });

  return updated;
}

export async function completeOnboardingTask(
  id: string,
  tenantId: string,
  reason: string,
  actor: string
): Promise<OnboardingTaskRow> {
  return updateOnboardingTask(
    id,
    tenantId,
    { status: 'completed', completedAt: new Date(), completedBy: actor },
    reason,
    actor
  );
}

/* -- Dossier completeness --------------------------------- */

/**
 * Recalculate & store completeness score for a dossier based on
 * how many onboarding tasks are completed.
 */
export async function refreshCompletenessScore(dossierId: string, tenantId: string): Promise<number> {
  const tasks = await listOnboardingTasks(dossierId, tenantId);
  if (tasks.length === 0) return 0;

  const completed = tasks.filter((t) => t.status === 'completed').length;
  const score = Math.round((completed / tasks.length) * 100);

  const db = getPgDb();
  await db
    .update(payerDossier)
    .set({ completenessScore: score, updatedAt: new Date() })
    .where(and(eq(payerDossier.id, dossierId), eq(payerDossier.tenantId, tenantId)));

  return score;
}

/* -- Seed default onboarding tasks for a connector type --- */

const DEFAULT_ONBOARDING_TASKS: Record<
  string,
  Array<{ taskType: string; title: string; description: string }>
> = {
  clearinghouse_edi: [
    {
      taskType: 'credentials',
      title: 'Obtain EDI credentials',
      description: 'Request payer ID + submitter ID from clearinghouse',
    },
    {
      taskType: 'enrollment',
      title: 'Complete payer enrollment',
      description: 'Submit enrollment form via clearinghouse portal',
    },
    {
      taskType: 'test_claim',
      title: 'Submit test claim',
      description: 'Send a test 837P and verify 999 acknowledgement',
    },
    {
      taskType: 'go_live',
      title: 'Go-live approval',
      description: 'Confirm production readiness with ops team',
    },
  ],
  government_portal: [
    {
      taskType: 'credentials',
      title: 'Obtain portal credentials',
      description: 'Register facility and get API credentials',
    },
    {
      taskType: 'facility_setup',
      title: 'Complete facility setup',
      description: 'Configure facility code and provider details',
    },
    {
      taskType: 'test_submission',
      title: 'Submit test claim',
      description: 'Submit claim in test mode and verify response',
    },
    {
      taskType: 'go_live',
      title: 'Go-live approval',
      description: 'Enable production submission after verification',
    },
  ],
  manual: [
    {
      taskType: 'contacts',
      title: 'Collect payer contacts',
      description: 'Gather submission contacts and claim addresses',
    },
    {
      taskType: 'forms',
      title: 'Prepare claim forms',
      description: 'Download and configure required claim form templates',
    },
    {
      taskType: 'test_submission',
      title: 'Submit test claim',
      description: 'Mail/fax a test claim and track response',
    },
  ],
};

/**
 * Seed default onboarding tasks for a dossier based on its integration mode.
 * Idempotent -- skips if tasks already exist.
 */
export async function seedOnboardingTasks(
  dossierId: string,
  integrationMode: string,
  tenantId: string,
  payerId: string,
  actor?: string
): Promise<OnboardingTaskRow[]> {
  const existing = await listOnboardingTasks(dossierId, tenantId);
  if (existing.length > 0) return existing;

  const templates = DEFAULT_ONBOARDING_TASKS[integrationMode] ?? DEFAULT_ONBOARDING_TASKS.manual!;
  const tasks: OnboardingTaskRow[] = [];

  for (let i = 0; i < templates.length; i++) {
    const t = templates[i];
    const created = await insertOnboardingTask(
      {
        tenantId,
        dossierId,
        payerId,
        taskType: t.taskType,
        title: t.title,
        description: t.description,
        status: 'pending',
        sortOrder: i + 1,
      },
      `Seeded from ${integrationMode} template`,
      actor
    );
    tasks.push(created);
  }

  await refreshCompletenessScore(dossierId, tenantId);
  return tasks;
}
