/**
 * Portal Settings -- Phase 27
 *
 * Patient-facing settings: language preference, notification preferences,
 * MFA stub/roadmap, display preferences.
 *
 * In-memory store per patient DFN. Settings persist across sessions
 * but reset on API restart (in-memory).
 *
 * VistA integration mapping (target):
 * - File #200 (New Person) for preferred language if provider-managed
 * - KERNEL alert preferences for notification routing
 */

import { portalAudit } from "./portal-audit.js";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* DB repo -- lazy-wired (Phase 127: PG durability)                      */
/* ------------------------------------------------------------------ */

export interface SettingsRepo {
  upsertSetting(data: {
    tenantId?: string;
    patientDfn: string;
    language: string;
    notificationsJson: string;
    displayJson: string;
    mfaJson: string;
  }): any;
  findSettingByDfn(tenantId: string, patientDfn: string): any;
  countSettings(): any;
}

let _settingsRepo: SettingsRepo | null = null;

/** Wire the portal settings repo after DB init. Called from index.ts. */
export function initSettingsRepo(repo: SettingsRepo): void {
  _settingsRepo = repo;
  log.info("Portal settings store wired to PG (Phase 127)");
}

function settingsDbWarn(op: string, err: unknown): void {
  log.warn(`Portal settings DB ${op} failed (cache-only)`, {
    error: err instanceof Error ? err.message : String(err),
  });
}

function settingsToDbFields(s: PortalSettings): {
  patientDfn: string;
  language: string;
  notificationsJson: string;
  displayJson: string;
  mfaJson: string;
} {
  return {
    patientDfn: s.patientDfn,
    language: s.language,
    notificationsJson: JSON.stringify(s.notifications),
    displayJson: JSON.stringify(s.display),
    mfaJson: JSON.stringify(s.mfa),
  };
}

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type PortalLanguage = "en" | "es" | "fr" | "vi" | "zh" | "ko" | "tl" | "fil";

export interface NotificationPrefs {
  emailEnabled: boolean;
  smsEnabled: boolean;
  appointmentReminders: boolean;
  labResultsReady: boolean;
  messageReceived: boolean;
  prescriptionReady: boolean;
}

export interface DisplayPrefs {
  fontSize: "small" | "medium" | "large";
  highContrast: boolean;
  compactView: boolean;
}

export interface MfaStatus {
  enabled: boolean;
  method: "none" | "totp" | "sms";
  /** MFA is not yet implemented -- this is the roadmap stub */
  roadmap: string;
}

export interface PortalSettings {
  patientDfn: string;
  language: PortalLanguage;
  notifications: NotificationPrefs;
  display: DisplayPrefs;
  mfa: MfaStatus;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Store (cache key: tenantId:patientDfn for tenant isolation)          */
/* ------------------------------------------------------------------ */

const settingsStore = new Map<string, PortalSettings>();

function cacheKey(tenantId: string, patientDfn: string): string {
  return `${tenantId}:${patientDfn}`;
}

function defaultSettings(patientDfn: string): PortalSettings {
  return {
    patientDfn,
    language: "en",
    notifications: {
      emailEnabled: false,
      smsEnabled: false,
      appointmentReminders: true,
      labResultsReady: true,
      messageReceived: true,
      prescriptionReady: true,
    },
    display: {
      fontSize: "medium",
      highContrast: false,
      compactView: false,
    },
    mfa: {
      enabled: false,
      method: "none",
      roadmap:
        "MFA support is planned for a future release. When available, " +
        "you will be able to enable TOTP (authenticator app) or SMS-based " +
        "two-factor authentication for additional account security.",
    },
    updatedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* API                                                                  */
/* ------------------------------------------------------------------ */

function rowToSettings(row: {
  patientDfn: string;
  language?: string | null;
  notificationsJson?: string | null;
  displayJson?: string | null;
  mfaJson?: string | null;
  updatedAt?: string | null;
}): PortalSettings {
  const defaults = defaultSettings(row.patientDfn);
  const parseJson = <T>(value: unknown, fallback: T): T => {
    if (typeof value !== "string" || value.trim() === "") return fallback;
    try {
      const parsed = JSON.parse(value);
      return (parsed ?? fallback) as T;
    } catch {
      return fallback;
    }
  };

  return {
    patientDfn: row.patientDfn,
    language: (row.language as PortalLanguage) ?? defaults.language,
    notifications: parseJson(row.notificationsJson, defaults.notifications),
    display: parseJson(row.displayJson, defaults.display),
    mfa: parseJson(row.mfaJson, defaults.mfa),
    updatedAt: row.updatedAt ?? defaults.updatedAt,
  };
}

export async function getSettings(tenantId: string, patientDfn: string): Promise<PortalSettings> {
  const key = cacheKey(tenantId, patientDfn);
  let settings = settingsStore.get(key);
  if (!settings && _settingsRepo) {
    try {
      const row = await Promise.resolve(_settingsRepo.findSettingByDfn(tenantId, patientDfn));
      if (row) {
        settings = rowToSettings(row);
        settingsStore.set(key, settings);
      }
    } catch (e) {
      settingsDbWarn("find", e);
    }
  }
  if (!settings) {
    settings = defaultSettings(patientDfn);
    settingsStore.set(key, settings);
  }
  return settings;
}

const VALID_LANGUAGES: PortalLanguage[] = ["en", "es", "fr", "vi", "zh", "ko", "tl", "fil"];
const VALID_FONT_SIZES = ["small", "medium", "large"];

export async function updateSettings(
  tenantId: string,
  patientDfn: string,
  patch: Partial<{
    language: PortalLanguage;
    notifications: Partial<NotificationPrefs>;
    display: Partial<DisplayPrefs>;
  }>
): Promise<PortalSettings | { error: string }> {
  const settings = await getSettings(tenantId, patientDfn);
  const changes: string[] = [];

  if (patch.language !== undefined) {
    if (!VALID_LANGUAGES.includes(patch.language)) {
      return { error: `Invalid language. Valid: ${VALID_LANGUAGES.join(", ")}` };
    }
    if (settings.language !== patch.language) {
      settings.language = patch.language;
      changes.push(`language->${patch.language}`);
    }
  }

  if (patch.notifications) {
    for (const [key, val] of Object.entries(patch.notifications)) {
      if (typeof val === "boolean" && key in settings.notifications) {
        const k = key as keyof NotificationPrefs;
        if (settings.notifications[k] !== val) {
          settings.notifications[k] = val;
          changes.push(`notifications.${k}->${val}`);
        }
      }
    }
  }

  if (patch.display) {
    if (patch.display.fontSize !== undefined) {
      if (!VALID_FONT_SIZES.includes(patch.display.fontSize)) {
        return { error: `Invalid fontSize. Valid: ${VALID_FONT_SIZES.join(", ")}` };
      }
      if (settings.display.fontSize !== patch.display.fontSize) {
        settings.display.fontSize = patch.display.fontSize;
        changes.push(`display.fontSize->${patch.display.fontSize}`);
      }
    }
    if (patch.display.highContrast !== undefined && typeof patch.display.highContrast === "boolean") {
      settings.display.highContrast = patch.display.highContrast;
      changes.push(`display.highContrast->${patch.display.highContrast}`);
    }
    if (patch.display.compactView !== undefined && typeof patch.display.compactView === "boolean") {
      settings.display.compactView = patch.display.compactView;
      changes.push(`display.compactView->${patch.display.compactView}`);
    }
  }

  settings.updatedAt = new Date().toISOString();
  settingsStore.set(cacheKey(tenantId, patientDfn), settings);

  // Phase 127: Write-through to PG (fire-and-forget)
  if (_settingsRepo) {
    try {
      void Promise.resolve(
        _settingsRepo.upsertSetting({ ...settingsToDbFields(settings), tenantId })
      )
        .catch((e: unknown) => settingsDbWarn("upsert", e));
    } catch (e) { settingsDbWarn("upsert", e); }
  }

  if (changes.length > 0) {
    portalAudit("portal.settings.update", "success", patientDfn, {
      tenantId,
      detail: { changes },
    });
  }

  return settings;
}

/** Available language options for the settings UI */
export const LANGUAGE_OPTIONS: { code: PortalLanguage; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "zh", label: "中文" },
  { code: "ko", label: "한국어" },
  { code: "tl", label: "Tagalog" },
  { code: "fil", label: "Filipino" },
];
