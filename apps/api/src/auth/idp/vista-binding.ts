/**
 * VistA Session Binding -- Phase 66.
 *
 * When authentication is via OIDC/SAML, the user has *app-level* identity but
 * does NOT yet have a VistA RPC session. Clinical actions (reading patient data,
 * placing orders) require VistA authorization via XWB RPC Broker.
 *
 * This module provides:
 *   1. `bindVistaSession()` -- attempts to create a VistA RPC session using
 *      the user's VistA credentials (access/verify codes).
 *   2. `getVistaBindingStatus()` -- checks if the current session has an
 *      active VistA binding.
 *   3. `requireVistaBinding()` -- middleware-style guard that returns 403
 *      with pendingTargets if VistA binding is not complete.
 *
 * Design:
 *   - OIDC/SAML provides identity + RBAC
 *   - VistA binding provides clinical authorization
 *   - Both can coexist: user logs in via SSO, then "connects" to VistA
 *   - In sandbox mode where VistA direct auth is the only login path,
 *     VistA binding is implicit (already authenticated via XUS AV CODE).
 */

import { log } from "../../lib/logger.js";
import { authenticateUser } from "../../vista/rpcBrokerClient.js";
import type { VistaBindingResult, VistaBindingStatus } from "./types.js";

/* ------------------------------------------------------------------ */
/* In-memory VistA binding store                                       */
/* ------------------------------------------------------------------ */

interface VistaBinding {
  duz: string;
  userName: string;
  facilityStation: string;
  facilityName: string;
  divisionIen: string;
  boundAt: number;
}

const vistaBindings = new Map<string, VistaBinding>();

/** TTL for VistA bindings (matches session TTL: 8h) */
const BINDING_TTL_MS = 8 * 60 * 60 * 1000;

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [sessionToken, binding] of vistaBindings) {
    if (now - binding.boundAt > BINDING_TTL_MS) {
      vistaBindings.delete(sessionToken);
    }
  }
}, 60 * 1000).unref();

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Bind a VistA RPC session to an existing app session.
 * This authenticates the user against VistA using access/verify codes,
 * linking their OIDC/SAML identity to a VistA DUZ.
 */
export async function bindVistaSession(
  sessionToken: string,
  accessCode: string,
  verifyCode: string,
): Promise<VistaBindingResult> {
  try {
    const userInfo = await authenticateUser(accessCode, verifyCode);

    vistaBindings.set(sessionToken, {
      duz: userInfo.duz,
      userName: userInfo.userName,
      facilityStation: userInfo.facilityStation,
      facilityName: userInfo.facilityName,
      divisionIen: userInfo.divisionIen,
      boundAt: Date.now(),
    });

    log.info("VistA session bound", { duz: userInfo.duz });

    return {
      ok: true,
      duz: userInfo.duz,
      userName: userInfo.userName,
      facilityStation: userInfo.facilityStation,
      facilityName: userInfo.facilityName,
      divisionIen: userInfo.divisionIen,
    };
  } catch (err: any) {
    // W8 FIX: Sanitize error -- don't leak MUMPS routine names or VistA internals
    const safeErr = (err.message || "unknown error").replace(/[\^%][A-Z0-9]+/g, "[redacted]");
    log.warn("VistA binding failed", { error: safeErr });
    return { ok: false, error: "VistA authentication failed" };
  }
}

/**
 * Get the VistA binding for a session token.
 */
export function getVistaBinding(sessionToken: string): VistaBinding | null {
  const binding = vistaBindings.get(sessionToken);
  if (!binding) return null;
  if (Date.now() - binding.boundAt > BINDING_TTL_MS) {
    vistaBindings.delete(sessionToken);
    return null;
  }
  return binding;
}

/**
 * Get the VistA binding status for a session.
 */
export function getVistaBindingStatus(sessionToken: string): VistaBindingStatus {
  const binding = getVistaBinding(sessionToken);
  if (binding) return "bound";
  return "pending";
}

/**
 * Remove VistA binding (on logout or session destroy).
 */
export function unbindVistaSession(sessionToken: string): void {
  vistaBindings.delete(sessionToken);
}

/**
 * Check if VistA binding is required and present.
 * Returns null if binding is OK, or an error response body if not.
 */
export function requireVistaBinding(
  sessionToken: string,
): null | { ok: false; error: string; vistaBindingRequired: true; pendingTargets: string[] } {
  const status = getVistaBindingStatus(sessionToken);
  if (status === "bound") return null;

  return {
    ok: false,
    error: "VistA session binding required for clinical actions. Authenticate with VistA credentials via POST /auth/idp/vista-bind.",
    vistaBindingRequired: true,
    pendingTargets: ["XUS AV CODE", "XWB CREATE CONTEXT"],
  };
}
