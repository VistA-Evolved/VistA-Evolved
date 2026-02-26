/**
 * Portal API client — all fetch calls to the Fastify API.
 * Uses credentials: 'include' for httpOnly cookie auth.
 * 
 * IMPORTANT: No PHI in console.log. No DFN in error messages.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function portalFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: body || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { ok: true, data: data as T };
  } catch (err) {
    return { ok: false, error: "Network error" };
  }
}

// ─── Portal Auth ───

export async function portalLogin(username: string, password: string) {
  return portalFetch("/portal/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function portalLogout() {
  return portalFetch("/portal/auth/logout", { method: "POST" });
}

export async function portalSession() {
  return portalFetch("/portal/auth/session");
}

// ─── Health Records (read-only, DFN-scoped by session) ───

export async function fetchAllergies() {
  return portalFetch("/portal/health/allergies");
}

export async function fetchProblems() {
  return portalFetch("/portal/health/problems");
}

export async function fetchVitals() {
  return portalFetch("/portal/health/vitals");
}

export async function fetchLabs() {
  return portalFetch("/portal/health/labs");
}

export async function fetchMedications() {
  return portalFetch("/portal/health/medications");
}

export async function fetchConsults() {
  return portalFetch("/portal/health/consults");
}

export async function fetchSurgery() {
  return portalFetch("/portal/health/surgery");
}

export async function fetchDischargeSummaries() {
  return portalFetch("/portal/health/dc-summaries");
}

export async function fetchDemographics() {
  return portalFetch("/portal/health/demographics");
}

export async function fetchReports() {
  return portalFetch("/portal/health/reports");
}

export async function fetchImmunizations() {
  return portalFetch("/portal/health/immunizations");
}

// ─── PDF Export (Phase 27) ───

export function exportSectionUrl(section: string): string {
  return `${API_BASE}/portal/export/section/${section}`;
}

export function exportFullRecordUrl(): string {
  return `${API_BASE}/portal/export/full`;
}

// ─── Secure Messaging (Phase 27) ───

/** Phase 130: VistA MailMan inbox (primary — falls back to PG store server-side). */
export async function fetchVistaMailmanInbox(limit = 50) {
  return portalFetch(`/portal/mailman/inbox?limit=${limit}`);
}

/** Phase 130: VistA MailMan single message by IEN or local PG ID. */
export async function fetchVistaMailmanMessage(id: string) {
  return portalFetch(`/portal/mailman/message/${id}`);
}

/** Phase 130: Send via VistA MailMan primary, PG fallback. */
export async function sendVistaMailmanMessage(body: { subject: string; body: string; category?: string; clinicGroup?: string }) {
  return portalFetch("/portal/mailman/send", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchInbox() {
  return portalFetch("/portal/messages");
}

export async function fetchDrafts() {
  return portalFetch("/portal/messages/drafts");
}

export async function fetchSentMessages() {
  return portalFetch("/portal/messages/sent");
}

export async function fetchMessage(id: string) {
  return portalFetch(`/portal/messages/${id}`);
}

export async function fetchThread(messageId: string) {
  return portalFetch(`/portal/messages/${messageId}/thread`);
}

export async function createMessageDraft(body: {
  subject: string;
  body: string;
  category?: string;
  toDfn?: string;
}) {
  return portalFetch("/portal/messages", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateMessageDraft(id: string, patch: { subject?: string; body?: string }) {
  return portalFetch(`/portal/messages/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function deleteMessageDraft(id: string) {
  return portalFetch(`/portal/messages/${id}`, { method: "DELETE" });
}

export async function sendMessageDraft(id: string) {
  return portalFetch(`/portal/messages/${id}/send`, { method: "POST" });
}

export async function addMessageAttachment(
  id: string,
  attachment: { filename: string; mimeType: string; data: string }
) {
  return portalFetch(`/portal/messages/${id}/attachments`, {
    method: "POST",
    body: JSON.stringify(attachment),
  });
}

// ─── Appointments (Phase 27) ───

export async function fetchAppointments() {
  return portalFetch("/portal/appointments");
}

export async function fetchAppointmentDetail(id: string) {
  return portalFetch(`/portal/appointments/${id}`);
}

export async function requestNewAppointment(body: {
  clinicName: string;
  appointmentType?: string;
  preferredDate: string;
  reason: string;
}) {
  return portalFetch("/portal/appointments/request", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function requestAppointmentCancellation(id: string, reason: string) {
  return portalFetch(`/portal/appointments/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function requestAppointmentReschedule(id: string, preference: string) {
  return portalFetch(`/portal/appointments/${id}/reschedule`, {
    method: "POST",
    body: JSON.stringify({ preference }),
  });
}

// ─── Record Sharing (Phase 27) ───

export async function fetchShares() {
  return portalFetch("/portal/shares");
}

export async function createShare(body: {
  sections: string[];
  label: string;
  ttlHours?: number;
  patientDob?: string;
}) {
  return portalFetch("/portal/shares", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function revokeShareLink(id: string) {
  return portalFetch(`/portal/shares/${id}/revoke`, { method: "POST" });
}

export async function previewShare(token: string) {
  return portalFetch(`/portal/share/preview/${token}`);
}

export async function verifyShare(token: string, body: { accessCode: string; patientDob: string; captchaToken?: string }) {
  return portalFetch(`/portal/share/verify/${token}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ─── Exports (Phase 31) ───

export async function exportJson(sections?: string[]) {
  const query = sections?.length ? `?sections=${sections.join(",")}` : "";
  return portalFetch(`/portal/export/json${query}`);
}

export async function getShcCapabilities() {
  return portalFetch("/portal/shc/capabilities");
}

export async function exportShc(dataset: string) {
  return portalFetch(`/portal/export/shc/${dataset}`);
}

// ─── Settings (Phase 27) ───

export async function fetchSettings() {
  return portalFetch("/portal/settings");
}

export async function updatePortalSettings(patch: {
  language?: string;
  notifications?: Record<string, boolean>;
  display?: Record<string, unknown>;
}) {
  return portalFetch("/portal/settings", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

// ─── Proxy Access (Phase 27) ───

export async function fetchProxies() {
  return portalFetch("/portal/proxy/list");
}

export async function grantProxyAccess(body: {
  proxyDfn: string;
  proxyName: string;
  relationship: string;
  accessLevel?: string;
}) {
  return portalFetch("/portal/proxy/grant", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function revokeProxyAccess(proxyId: string) {
  return portalFetch("/portal/proxy/revoke", {
    method: "POST",
    body: JSON.stringify({ proxyId }),
  });
}

// ─── Telehealth (Phase 30) ───

export async function fetchTelehealthRoom(appointmentId: string) {
  return portalFetch(`/portal/telehealth/appointment/${appointmentId}/room`);
}

export async function joinTelehealthRoom(roomId: string) {
  return portalFetch(`/portal/telehealth/rooms/${roomId}/join`, { method: "POST" });
}

export async function getTelehealthWaitingRoom(roomId: string) {
  return portalFetch(`/portal/telehealth/rooms/${roomId}/waiting`);
}

export async function getTelehealthDeviceRequirements() {
  return portalFetch("/portal/telehealth/device-check");
}

export async function submitDeviceCheckReport(report: Record<string, unknown>) {
  return portalFetch("/portal/telehealth/device-check/report", {
    method: "POST",
    body: JSON.stringify(report),
  });
}

// ─── Refills (Phase 32) ───

export async function fetchRefills() {
  return portalFetch("/portal/refills");
}

export async function requestRefill(medicationName: string, medicationId: string) {
  return portalFetch("/portal/refills", {
    method: "POST",
    body: JSON.stringify({ medicationName, medicationId }),
  });
}

export async function cancelRefill(refillId: string) {
  return portalFetch(`/portal/refills/${refillId}/cancel`, { method: "POST" });
}

// ─── Tasks (Phase 32) ───

export async function fetchTasks(status?: string) {
  const qs = status ? `?status=${status}` : "";
  return portalFetch(`/portal/tasks${qs}`);
}

export async function fetchTaskCounts() {
  return portalFetch("/portal/tasks/counts");
}

export async function dismissTask(taskId: string) {
  return portalFetch(`/portal/tasks/${taskId}/dismiss`, { method: "POST" });
}

export async function completeTask(taskId: string) {
  return portalFetch(`/portal/tasks/${taskId}/complete`, { method: "POST" });
}

// --- AI Help (Phase 33) ---

export async function fetchLabEducation(labName: string, labValue?: string) {
  return portalFetch("/ai/portal/education", {
    method: "POST",
    body: JSON.stringify({ labName, labValue }),
  });
}

export async function askPortalSearch(query: string) {
  return portalFetch("/ai/portal/search", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

// ─── Documents (Phase 140) ───

export async function fetchDocumentTypes() {
  return portalFetch("/portal/documents");
}

export async function generateDocument(documentType: string) {
  return portalFetch("/portal/documents/generate", {
    method: "POST",
    body: JSON.stringify({ documentType }),
  });
}

export function documentDownloadUrl(token: string): string {
  return `${API_BASE}/portal/documents/download/${token}`;
}

// ─── Consents (Phase 140) ───

export async function fetchConsents() {
  return portalFetch("/portal/consents");
}

export async function updateConsent(consentType: string, status: string) {
  return portalFetch("/portal/consents", {
    method: "POST",
    body: JSON.stringify({ consentType, status }),
  });
}
