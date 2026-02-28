/**
 * Credential Vault + Accreditation Routes — Phase 110
 *
 * DB-backed REST endpoints for credential artifacts, documents,
 * accreditation status tracking, and accreditation tasks.
 *
 * Endpoints:
 *   GET    /rcm/credential-vault                     — list credentials
 *   POST   /rcm/credential-vault                     — create credential
 *   GET    /rcm/credential-vault/expiring             — expiring credentials
 *   GET    /rcm/credential-vault/stats                — credential stats
 *   GET    /rcm/credential-vault/:id                  — get credential
 *   PATCH  /rcm/credential-vault/:id                  — update credential
 *   POST   /rcm/credential-vault/:id/verify           — mark credential verified
 *   POST   /rcm/credential-vault/:id/documents        — add document
 *   GET    /rcm/credential-vault/:id/documents        — list documents
 *   DELETE /rcm/credential-vault/documents/:docId     — delete document
 *
 *   GET    /rcm/accreditation                         — list accreditations
 *   POST   /rcm/accreditation                         — create accreditation
 *   GET    /rcm/accreditation/stats                   — accreditation stats
 *   GET    /rcm/accreditation/:id                     — get accreditation
 *   PATCH  /rcm/accreditation/:id                     — update accreditation
 *   POST   /rcm/accreditation/:id/verify              — mark accreditation verified
 *   POST   /rcm/accreditation/:id/notes               — add note
 *   GET    /rcm/accreditation/:id/tasks               — list tasks
 *   POST   /rcm/accreditation/:id/tasks               — create task
 *   PATCH  /rcm/accreditation/tasks/:taskId           — update task
 *   POST   /rcm/accreditation/tasks/:taskId/complete  — complete task
 *   DELETE /rcm/accreditation/tasks/:taskId           — delete task
 *
 * Auth: /rcm/ catch-all in AUTH_RULES covers session auth.
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
  createCredential,
  getCredentialById,
  listCredentials,
  updateCredential,
  verifyCredential,
  getExpiringCredentials,
  countCredentials,
  addDocument,
  listDocuments,
  deleteDocument,
} from "./credential-vault-repo.js";
import {
  createAccreditation,
  getAccreditationById,
  listAccreditations,
  updateAccreditation,
  verifyAccreditation,
  addNote,
  countAccreditations,
  createTask,
  listTasks,
  updateTask,
  completeTask,
  deleteTask,
} from "./accreditation-repo.js";
import { appendRcmAudit } from "../audit/rcm-audit.js";

const credentialVaultRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {

  /* ================================================================ */
  /* Credential Vault                                                  */
  /* ================================================================ */

  /* ── GET /rcm/credential-vault — list ──────────────────── */
  server.get("/rcm/credential-vault", async (request, _reply) => {
    const q = (request.query as any) || {};
    const tenantId = q.tenantId || "default";
    const items = await listCredentials(tenantId, {
      entityType: q.entityType,
      entityId: q.entityId,
      credentialType: q.credentialType,
      status: q.status,
    });
    return { ok: true, items, count: items.length };
  });

  /* ── POST /rcm/credential-vault — create ───────────────── */
  server.post("/rcm/credential-vault", async (request, reply) => {
    const body = (request.body as any) || {};
    if (!body.entityType || !body.entityId || !body.entityName || !body.credentialType || !body.credentialValue) {
      return reply.code(400).send({ ok: false, error: "Missing required fields: entityType, entityId, entityName, credentialType, credentialValue" });
    }
    const item = await createCredential({
      tenantId: body.tenantId,
      entityType: body.entityType,
      entityId: body.entityId,
      entityName: body.entityName,
      credentialType: body.credentialType,
      credentialValue: body.credentialValue,
      issuingAuthority: body.issuingAuthority,
      state: body.state,
      status: body.status,
      issuedAt: body.issuedAt,
      expiresAt: body.expiresAt,
      renewalReminderDays: body.renewalReminderDays,
      metadata: body.metadata,
      createdBy: body.createdBy || "system",
    });
    appendRcmAudit("credential_vault_create", {
      userId: body.createdBy,
      detail: { credentialId: item.id, credentialType: item.credentialType, entityId: item.entityId },
    });
    return reply.code(201).send({ ok: true, item });
  });

  /* ── GET /rcm/credential-vault/expiring — expiring creds ─ */
  server.get("/rcm/credential-vault/expiring", async (request, _reply) => {
    const q = (request.query as any) || {};
    const tenantId = q.tenantId || "default";
    const withinDays = parseInt(q.withinDays, 10) || 90;
    const items = await getExpiringCredentials(tenantId, withinDays);
    return { ok: true, items, count: items.length };
  });

  /* ── GET /rcm/credential-vault/stats — summary stats ───── */
  server.get("/rcm/credential-vault/stats", async (request, _reply) => {
    const q = (request.query as any) || {};
    const tenantId = q.tenantId || "default";
    const total = await countCredentials(tenantId);
    const expiring = (await getExpiringCredentials(tenantId, 90)).length;
    return { ok: true, stats: { total, expiringSoon: expiring } };
  });

  /* ── GET /rcm/credential-vault/:id — detail ────────────── */
  server.get("/rcm/credential-vault/:id", async (request, reply) => {
    const { id } = request.params as any;
    const q = (request.query as any) || {};
    const tenantId = q.tenantId || "default";
    const item = await getCredentialById(tenantId, id);
    if (!item) return reply.code(404).send({ ok: false, error: "Credential not found" });
    const documents = await listDocuments(id);
    return { ok: true, item, documents };
  });

  /* ── PATCH /rcm/credential-vault/:id — update ──────────── */
  server.patch("/rcm/credential-vault/:id", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const tenantId = body.tenantId || "default";
    const item = await updateCredential(tenantId, id, body);
    if (!item) return reply.code(404).send({ ok: false, error: "Credential not found" });
    appendRcmAudit("credential_vault_update", {
      userId: body.updatedBy,
      detail: { credentialId: id, fields: Object.keys(body) },
    });
    return { ok: true, item };
  });

  /* ── POST /rcm/credential-vault/:id/verify — verify ────── */
  server.post("/rcm/credential-vault/:id/verify", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const tenantId = body.tenantId || "default";
    const verifiedBy = body.verifiedBy || "system";
    const item = await verifyCredential(tenantId, id, verifiedBy);
    if (!item) return reply.code(404).send({ ok: false, error: "Credential not found" });
    appendRcmAudit("credential_vault_verify", {
      userId: verifiedBy,
      detail: { credentialId: id },
    });
    return { ok: true, item };
  });

  /* ── POST /rcm/credential-vault/:id/documents — add doc ── */
  server.post("/rcm/credential-vault/:id/documents", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    if (!body.fileName || !body.mimeType || !body.storagePath) {
      return reply.code(400).send({ ok: false, error: "Missing required fields: fileName, mimeType, storagePath" });
    }
    const doc = await addDocument({
      credentialId: id,
      tenantId: body.tenantId,
      fileName: body.fileName,
      mimeType: body.mimeType,
      storagePath: body.storagePath,
      fileSizeBytes: body.fileSizeBytes,
      sha256Hash: body.sha256Hash,
      uploadedBy: body.uploadedBy || "system",
    });
    appendRcmAudit("credential_document_add", {
      userId: body.uploadedBy,
      detail: { credentialId: id, documentId: doc.id, fileName: doc.fileName },
    });
    return reply.code(201).send({ ok: true, document: doc });
  });

  /* ── GET /rcm/credential-vault/:id/documents — list docs ── */
  server.get("/rcm/credential-vault/:id/documents", async (request, _reply) => {
    const { id } = request.params as any;
    const documents = await listDocuments(id);
    return { ok: true, documents, count: documents.length };
  });

  /* ── DELETE /rcm/credential-vault/documents/:docId ─────── */
  server.delete("/rcm/credential-vault/documents/:docId", async (request, reply) => {
    const { docId } = request.params as any;
    const deleted = await deleteDocument(docId);
    if (!deleted) return reply.code(404).send({ ok: false, error: "Document not found" });
    appendRcmAudit("credential_document_delete", {
      detail: { documentId: docId },
    });
    return { ok: true };
  });

  /* ================================================================ */
  /* Accreditation Status                                              */
  /* ================================================================ */

  /* ── GET /rcm/accreditation — list ─────────────────────── */
  server.get("/rcm/accreditation", async (request, _reply) => {
    const q = (request.query as any) || {};
    const tenantId = q.tenantId || "default";
    const items = await listAccreditations(tenantId, {
      payerId: q.payerId,
      providerEntityId: q.providerEntityId,
      status: q.status,
    });
    return { ok: true, items, count: items.length };
  });

  /* ── POST /rcm/accreditation — create ──────────────────── */
  server.post("/rcm/accreditation", async (request, reply) => {
    const body = (request.body as any) || {};
    if (!body.payerId || !body.payerName || !body.providerEntityId) {
      return reply.code(400).send({ ok: false, error: "Missing required fields: payerId, payerName, providerEntityId" });
    }
    const item = await createAccreditation({
      tenantId: body.tenantId,
      payerId: body.payerId,
      payerName: body.payerName,
      providerEntityId: body.providerEntityId,
      status: body.status,
      effectiveDate: body.effectiveDate,
      expirationDate: body.expirationDate,
      createdBy: body.createdBy || "system",
    });
    appendRcmAudit("accreditation_create", {
      payerId: body.payerId,
      userId: body.createdBy,
      detail: { accreditationId: item.id, providerEntityId: item.providerEntityId },
    });
    return reply.code(201).send({ ok: true, item });
  });

  /* ── GET /rcm/accreditation/stats — summary ────────────── */
  server.get("/rcm/accreditation/stats", async (request, _reply) => {
    const q = (request.query as any) || {};
    const tenantId = q.tenantId || "default";
    const total = await countAccreditations(tenantId);
    const all = await listAccreditations(tenantId);
    const byStatus: Record<string, number> = {};
    for (const a of all) { byStatus[a.status] = (byStatus[a.status] || 0) + 1; }
    return { ok: true, stats: { total, byStatus } };
  });

  /* ── GET /rcm/accreditation/:id — detail ───────────────── */
  server.get("/rcm/accreditation/:id", async (request, reply) => {
    const { id } = request.params as any;
    const q = (request.query as any) || {};
    const tenantId = q.tenantId || "default";
    const item = await getAccreditationById(tenantId, id);
    if (!item) return reply.code(404).send({ ok: false, error: "Accreditation not found" });
    const tasks = await listTasks(id);
    return { ok: true, item, tasks };
  });

  /* ── PATCH /rcm/accreditation/:id — update ─────────────── */
  server.patch("/rcm/accreditation/:id", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const tenantId = body.tenantId || "default";
    const item = await updateAccreditation(tenantId, id, body);
    if (!item) return reply.code(404).send({ ok: false, error: "Accreditation not found" });
    appendRcmAudit("accreditation_update", {
      payerId: item.payerId,
      userId: body.updatedBy,
      detail: { accreditationId: id, fields: Object.keys(body) },
    });
    return { ok: true, item };
  });

  /* ── POST /rcm/accreditation/:id/verify — verify ───────── */
  server.post("/rcm/accreditation/:id/verify", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const tenantId = body.tenantId || "default";
    const verifiedBy = body.verifiedBy || "system";
    const item = await verifyAccreditation(tenantId, id, verifiedBy);
    if (!item) return reply.code(404).send({ ok: false, error: "Accreditation not found" });
    appendRcmAudit("accreditation_verify", {
      payerId: item.payerId,
      userId: verifiedBy,
      detail: { accreditationId: id },
    });
    return { ok: true, item };
  });

  /* ── POST /rcm/accreditation/:id/notes — add note ─────── */
  server.post("/rcm/accreditation/:id/notes", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const tenantId = body.tenantId || "default";
    if (!body.text) return reply.code(400).send({ ok: false, error: "Missing required field: text" });
    const item = await addNote(tenantId, id, body.author || "system", body.text);
    if (!item) return reply.code(404).send({ ok: false, error: "Accreditation not found" });
    return { ok: true, item };
  });

  /* ── GET /rcm/accreditation/:id/tasks — list tasks ─────── */
  server.get("/rcm/accreditation/:id/tasks", async (request, _reply) => {
    const { id } = request.params as any;
    const tasks = await listTasks(id);
    return { ok: true, tasks, count: tasks.length };
  });

  /* ── POST /rcm/accreditation/:id/tasks — create task ───── */
  server.post("/rcm/accreditation/:id/tasks", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    if (!body.title) return reply.code(400).send({ ok: false, error: "Missing required field: title" });
    const task = await createTask({
      accreditationId: id,
      tenantId: body.tenantId,
      title: body.title,
      description: body.description,
      priority: body.priority,
      dueDate: body.dueDate,
      assignedTo: body.assignedTo,
    });
    appendRcmAudit("accreditation_task_create", {
      detail: { accreditationId: id, taskId: task.id, title: task.title },
    });
    return reply.code(201).send({ ok: true, task });
  });

  /* ── PATCH /rcm/accreditation/tasks/:taskId — update ───── */
  server.patch("/rcm/accreditation/tasks/:taskId", async (request, reply) => {
    const { taskId } = request.params as any;
    const body = (request.body as any) || {};
    const task = await updateTask(taskId, body);
    if (!task) return reply.code(404).send({ ok: false, error: "Task not found" });
    appendRcmAudit("accreditation_task_update", {
      detail: { taskId, fields: Object.keys(body) },
    });
    return { ok: true, task };
  });

  /* ── POST /rcm/accreditation/tasks/:taskId/complete ────── */
  server.post("/rcm/accreditation/tasks/:taskId/complete", async (request, reply) => {
    const { taskId } = request.params as any;
    const body = (request.body as any) || {};
    const task = await completeTask(taskId, body.completedBy || "system");
    if (!task) return reply.code(404).send({ ok: false, error: "Task not found" });
    appendRcmAudit("accreditation_task_complete", {
      userId: body.completedBy,
      detail: { taskId },
    });
    return { ok: true, task };
  });

  /* ── DELETE /rcm/accreditation/tasks/:taskId ────────────── */
  server.delete("/rcm/accreditation/tasks/:taskId", async (request, reply) => {
    const { taskId } = request.params as any;
    const deleted = await deleteTask(taskId);
    if (!deleted) return reply.code(404).send({ ok: false, error: "Task not found" });
    appendRcmAudit("accreditation_task_delete", {
      detail: { taskId },
    });
    return { ok: true };
  });
};

export default credentialVaultRoutes;
