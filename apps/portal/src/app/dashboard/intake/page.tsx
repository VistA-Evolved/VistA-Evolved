"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/I18nProvider";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function portalFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  return res.json();
}

/* ================================================================== */
/* i18n labels — Phase 132                                             */
/* ================================================================== */

const I18N: Record<string, Record<string, string>> = {
  en: {
    title: "Pre-Visit Intake",
    subtitle: "Complete your health questionnaire before your appointment to save time during your visit.",
    startNew: "Start New Intake",
    language: "Language:",
    begin: "Begin Questionnaire",
    starting: "Starting...",
    continueTitle: "Continue In-Progress",
    continueBtn: "Continue",
    started: "Started:",
    loading: "Loading...",
    connectionError: "Connection error",
    failedStart: "Failed to start intake",
  },
  fil: {
    title: "Pre-Visit Intake",
    subtitle: "Kumpletuhin ang iyong health questionnaire bago ang iyong appointment para makatipid ng oras.",
    startNew: "Magsimula ng Bagong Intake",
    language: "Wika:",
    begin: "Simulan ang Questionnaire",
    starting: "Sinisimulan...",
    continueTitle: "Ipagpatuloy ang In-Progress",
    continueBtn: "Ipagpatuloy",
    started: "Nagsimula:",
    loading: "Naglo-load...",
    connectionError: "Error sa koneksyon",
    failedStart: "Hindi nasimulan ang intake",
  },
  es: {
    title: "Cuestionario Pre-Visita",
    subtitle: "Complete su cuestionario de salud antes de su cita para ahorrar tiempo durante su visita.",
    startNew: "Iniciar Nuevo Cuestionario",
    language: "Idioma:",
    begin: "Comenzar Cuestionario",
    starting: "Iniciando...",
    continueTitle: "Continuar en Progreso",
    continueBtn: "Continuar",
    started: "Iniciado:",
    loading: "Cargando...",
    connectionError: "Error de conexion",
    failedStart: "No se pudo iniciar el cuestionario",
  },
};

function t(locale: string, key: string): string {
  return I18N[locale]?.[key] || I18N.en[key] || key;
}

/* ================================================================== */
/* Intake Start Page — locale-aware with question schema                */
/* ================================================================== */

interface IntakeQuestion {
  questionKey: string;
  questionText: string;
  questionType: string;
  options: string[];
  required: boolean;
  category: string;
}

export default function IntakeStartPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [locale]);

  async function loadSessions() {
    setLoading(true);
    try {
      const res = await portalFetch("/intake/sessions");
      if (res.ok && res.sessions) {
        setSessions(res.sessions.filter((s: any) => s.status !== "filed" && s.status !== "filed_pending_integration"));
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }

  async function loadQuestions() {
    try {
      const res = await portalFetch(`/intake/question-schema?locale=${locale}`);
      if (res.ok && res.questions) {
        setQuestions(res.questions);
      }
    } catch {
      // fallback to empty — static text still shows
    }
  }

  async function startNewIntake() {
    setCreating(true);
    setNotice(null);
    try {
      const res = await portalFetch("/intake/sessions", {
        method: "POST",
        body: JSON.stringify({ language: locale, context: {} }),
      });
      if (res.ok && res.session) {
        router.push(`/dashboard/intake/${res.session.id}`);
      } else {
        setNotice({ type: "error", text: res.error || t(locale, "failedStart") });
      }
    } catch {
      setNotice({ type: "error", text: t(locale, "connectionError") });
    }
    setCreating(false);
  }

  const cardStyle: React.CSSProperties = {
    background: "var(--portal-bg-card, #fff)",
    border: "1px solid var(--portal-border, #e5e7eb)",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "16px",
  };

  const btnPrimary: React.CSSProperties = {
    background: "var(--portal-primary, #2563eb)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "12px 24px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: 600,
  };

  const btnSecondary: React.CSSProperties = {
    background: "transparent",
    color: "var(--portal-primary, #2563eb)",
    border: "1px solid var(--portal-primary, #2563eb)",
    borderRadius: "6px",
    padding: "10px 20px",
    cursor: "pointer",
    fontSize: "14px",
  };

  const statusColors: Record<string, string> = {
    not_started: "#9ca3af",
    in_progress: "#f59e0b",
    submitted: "#10b981",
    clinician_reviewed: "#6366f1",
  };

  // Language labels for the selector
  const langOptions: Record<string, string> = {
    en: "English",
    fil: "Filipino",
    es: "Espanol",
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>
        {t(locale, "title")}
      </h1>
      <p style={{ color: "var(--portal-text-muted, #6b7280)", marginBottom: "24px" }}>
        {t(locale, "subtitle")}
      </p>

      {notice && (
        <div style={{
          padding: "12px 16px", borderRadius: "6px", marginBottom: "16px",
          background: notice.type === "error" ? "#fef2f2" : "#f0fdf4",
          color: notice.type === "error" ? "#991b1b" : "#166534",
          border: `1px solid ${notice.type === "error" ? "#fecaca" : "#bbf7d0"}`,
        }}>
          {notice.text}
        </div>
      )}

      {/* Start new intake */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>
          {t(locale, "startNew")}
        </h2>
        <p style={{ fontSize: "14px", color: "var(--portal-text-muted, #6b7280)", marginBottom: "12px" }}>
          {t(locale, "language")}{" "}
          <strong>{langOptions[locale] || locale}</strong>
          <span style={{ fontSize: "12px", marginLeft: "8px", color: "#9ca3af" }}>
            (change via nav sidebar)
          </span>
        </p>

        {/* Preview of questions the patient will answer */}
        {questions.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "13px", color: "var(--portal-text-muted, #6b7280)", marginBottom: "8px" }}>
              {locale === "fil" ? "Mga tanong na sasagutin:" : locale === "es" ? "Preguntas que responder:" : "Questions you will answer:"}
            </p>
            <ul style={{ paddingLeft: "20px", margin: "0 0 8px", fontSize: "13px", color: "#6b7280" }}>
              {questions.slice(0, 5).map((q) => (
                <li key={q.questionKey} style={{ marginBottom: "4px" }}>
                  {q.questionText}
                  {q.required && <span style={{ color: "#ef4444", marginLeft: "2px" }}>*</span>}
                </li>
              ))}
              {questions.length > 5 && (
                <li style={{ fontStyle: "italic" }}>
                  +{questions.length - 5} more...
                </li>
              )}
            </ul>
          </div>
        )}

        <button style={btnPrimary} onClick={startNewIntake} disabled={creating}>
          {creating ? t(locale, "starting") : t(locale, "begin")}
        </button>
      </div>

      {/* Existing sessions */}
      {loading ? (
        <p style={{ color: "var(--portal-text-muted, #6b7280)" }}>{t(locale, "loading")}</p>
      ) : sessions.length > 0 ? (
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "12px" }}>
            {t(locale, "continueTitle")}
          </h2>
          {sessions.map((s) => (
            <div key={s.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{
                    display: "inline-block", padding: "2px 8px", borderRadius: "12px", fontSize: "12px",
                    background: statusColors[s.status] || "#9ca3af", color: "#fff", marginBottom: "4px",
                  }}>
                    {s.status?.replace(/_/g, " ")}
                  </span>
                  <p style={{ fontSize: "14px", color: "var(--portal-text-muted, #6b7280)", marginTop: "4px" }}>
                    {t(locale, "started")} {new Date(s.createdAt).toLocaleDateString()}
                    {s.context?.chiefComplaint && ` - ${s.context.chiefComplaint}`}
                  </p>
                </div>
                <button
                  style={btnSecondary}
                  onClick={() => router.push(`/dashboard/intake/${s.id}`)}
                >
                  {t(locale, "continueBtn")}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
