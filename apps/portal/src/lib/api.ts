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
