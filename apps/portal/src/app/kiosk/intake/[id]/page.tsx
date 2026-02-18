"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const KIOSK_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 min idle → warning
const KIOSK_LOGOUT_TIMEOUT_MS = 60 * 1000; // 60s after warning → reset

async function kioskFetch(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  return res.json();
}

/* ================================================================== */
/* Kiosk Intake Session — large-target adaptive form with idle timeout  */
/* ================================================================== */

export default function KioskIntakeSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;

  const [session, setSession] = useState<any>(null);
  const [qrItems, setQRItems] = useState<any[]>([]);
  const [nextItems, setNextItems] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [resumeToken, setResumeToken] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  const idleTimer = useRef<NodeJS.Timeout | null>(null);
  const logoutTimer = useRef<NodeJS.Timeout | null>(null);

  // Reset idle timer on any interaction
  const resetIdleTimer = useCallback(() => {
    setShowIdleWarning(false);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (idleTimer.current) clearTimeout(idleTimer.current);

    idleTimer.current = setTimeout(() => {
      setShowIdleWarning(true);
      logoutTimer.current = setTimeout(() => {
        // Save and redirect
        kioskFetch(`/intake/sessions/${sessionId}/save`, { method: "POST" });
        router.push("/kiosk/intake");
      }, KIOSK_LOGOUT_TIMEOUT_MS);
    }, KIOSK_IDLE_TIMEOUT_MS);
  }, [sessionId, router]);

  useEffect(() => {
    resetIdleTimer();
    const events = ["touchstart", "mousedown", "keydown", "scroll"];
    events.forEach((e) => document.addEventListener(e, resetIdleTimer));
    return () => {
      events.forEach((e) => document.removeEventListener(e, resetIdleTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    };
  }, [resetIdleTimer]);

  // Load session
  useEffect(() => {
    (async () => {
      setLoading(true);
      // Use the kiosk endpoint for session access (no portal cookie needed)
      const res = await kioskFetch(`/intake/sessions/${sessionId}`);
      if (res.ok) {
        setSession(res.session);
        setQRItems(res.questionnaireResponse?.item || []);
        if (res.progress) setProgress(res.progress);
        if (res.session?.status === "submitted") setCompleted(true);
      }
      setLoading(false);
    })();
  }, [sessionId]);

  // Fetch next questions
  useEffect(() => {
    if (session && !completed) {
      (async () => {
        const res = await kioskFetch(`/intake/sessions/${sessionId}/next-question`, {
          method: "POST",
          body: JSON.stringify({ questionnaireResponseSoFar: { resourceType: "QuestionnaireResponse", status: "in-progress", item: qrItems } }),
        });
        if (res.ok) {
          setNextItems(res.nextItems || []);
          if (res.progress) setProgress(res.progress);
        }
      })();
    }
  }, [session, completed, qrItems.length]);

  function handleAnswer(linkId: string, value: any) {
    setAnswers((prev) => ({ ...prev, [linkId]: value }));
  }

  async function submitBatch() {
    const batch = nextItems
      .map((item: any) => ({ linkId: item.linkId, text: item.text, answer: answers[item.linkId] !== undefined ? [{ value: answers[item.linkId] }] : [] }))
      .filter((a: any) => a.answer.length > 0);
    if (batch.length === 0) return;

    setSubmitting(true);
    const res = await kioskFetch(`/intake/sessions/${sessionId}/answers`, {
      method: "POST",
      body: JSON.stringify({ answers: batch }),
    });
    if (res.ok) {
      setQRItems(res.questionnaireResponse?.item || qrItems);
      setAnswers({});
      if (res.nextItems?.length) {
        setNextItems(res.nextItems);
      }
    }
    setSubmitting(false);
  }

  async function submitIntake() {
    setSubmitting(true);
    const res = await kioskFetch(`/intake/sessions/${sessionId}/submit`, { method: "POST" });
    if (res.ok) setCompleted(true);
    setSubmitting(false);
  }

  async function getResumeToken() {
    const res = await kioskFetch(`/kiosk/sessions/${sessionId}/resume-token`, { method: "POST" });
    if (res.ok) {
      setResumeToken(res.token);
      setShowQR(true);
    }
  }

  /* ---- Kiosk styles ---- */
  const containerStyle: React.CSSProperties = {
    maxWidth: 600, margin: "0 auto", padding: "32px 20px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  };

  const bigBtn: React.CSSProperties = {
    width: "100%", padding: "18px 32px", borderRadius: "12px",
    fontSize: "20px", fontWeight: 700, cursor: "pointer",
    border: "none", marginTop: "12px", minHeight: "64px",
  };

  const questionCard: React.CSSProperties = {
    background: "#fff", border: "2px solid #e5e7eb", borderRadius: "12px",
    padding: "24px", marginBottom: "20px",
  };

  const optionBtn = (selected: boolean): React.CSSProperties => ({
    width: "100%", padding: "16px 20px", textAlign: "left" as const,
    borderRadius: "10px", fontSize: "18px", cursor: "pointer",
    border: selected ? "3px solid #2563eb" : "2px solid #e5e7eb",
    background: selected ? "#eff6ff" : "#fff",
    fontWeight: selected ? 700 : 400, marginBottom: "8px",
  });

  const boolBtn = (selected: boolean): React.CSSProperties => ({
    flex: 1, padding: "18px", borderRadius: "10px", fontSize: "20px",
    cursor: "pointer", fontWeight: 700, minHeight: "64px",
    border: selected ? "3px solid #2563eb" : "2px solid #e5e7eb",
    background: selected ? "#eff6ff" : "#fff",
  });

  if (loading) return <div style={containerStyle}><p style={{ fontSize: "20px", textAlign: "center" }}>Loading...</p></div>;

  if (completed) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>&#10003;</div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "12px", color: "#166534" }}>
            Thank You
          </h1>
          <p style={{ fontSize: "18px", color: "#6b7280", marginBottom: "32px" }}>
            Your questionnaire has been submitted. A staff member will be with you shortly.
          </p>
          <button
            style={{ ...bigBtn, background: "#e5e7eb", color: "#374151" }}
            onClick={() => router.push("/kiosk/intake")}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Idle warning overlay */}
      {showIdleWarning && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.7)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#fff", borderRadius: "16px", padding: "40px",
            maxWidth: 400, textAlign: "center",
          }}>
            <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "12px" }}>
              Are you still there?
            </h2>
            <p style={{ fontSize: "16px", color: "#6b7280", marginBottom: "24px" }}>
              Your session will be saved and reset soon due to inactivity.
            </p>
            <button
              style={{ ...bigBtn, background: "#2563eb", color: "#fff" }}
              onClick={resetIdleTimer}
            >
              I&apos;m Still Here
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      {progress && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", color: "#6b7280", marginBottom: "6px" }}>
            <span>Progress</span>
            <span>{progress.percentComplete}%</span>
          </div>
          <div style={{ background: "#e5e7eb", borderRadius: "6px", height: "12px", overflow: "hidden" }}>
            <div style={{ background: "#2563eb", height: "100%", width: `${progress.percentComplete}%`, borderRadius: "6px", transition: "width 0.3s" }} />
          </div>
        </div>
      )}

      {/* QR code / resume token */}
      {showQR && resumeToken && (
        <div style={{ ...questionCard, borderColor: "#2563eb", textAlign: "center" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>Continue on your phone</h3>
          <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "12px" }}>
            Use this code to resume your questionnaire on another device:
          </p>
          <div style={{
            fontSize: "24px", fontWeight: 800, letterSpacing: "3px",
            padding: "16px", background: "#f3f4f6", borderRadius: "8px",
            fontFamily: "monospace",
          }}>
            {resumeToken}
          </div>
          <button style={{ ...bigBtn, background: "#e5e7eb", color: "#374151", marginTop: "12px" }} onClick={() => setShowQR(false)}>
            Close
          </button>
        </div>
      )}

      {/* Questions */}
      {nextItems.length > 0 ? (
        <div>
          {nextItems.map((item: any) => (
            <div key={item.linkId} style={questionCard}>
              <p style={{ fontSize: "20px", fontWeight: 600, marginBottom: "12px" }}>
                {item.text}
                {item.required && <span style={{ color: "#ef4444" }}> *</span>}
              </p>

              {item.type === "boolean" && (
                <div style={{ display: "flex", gap: "12px" }}>
                  <button style={boolBtn(answers[item.linkId] === true)} onClick={() => handleAnswer(item.linkId, true)}>Yes</button>
                  <button style={boolBtn(answers[item.linkId] === false)} onClick={() => handleAnswer(item.linkId, false)}>No</button>
                </div>
              )}

              {item.type === "string" && (
                <input
                  type="text"
                  style={{ width: "100%", padding: "16px", borderRadius: "10px", border: "2px solid #e5e7eb", fontSize: "18px" }}
                  value={answers[item.linkId] || ""}
                  onChange={(e) => handleAnswer(item.linkId, e.target.value)}
                  placeholder="Type here..."
                />
              )}

              {item.type === "integer" && (
                <input
                  type="number"
                  style={{ width: "100%", padding: "16px", borderRadius: "10px", border: "2px solid #e5e7eb", fontSize: "24px", textAlign: "center" }}
                  value={answers[item.linkId] ?? ""}
                  onChange={(e) => handleAnswer(item.linkId, parseInt(e.target.value) || 0)}
                  min={0} max={10}
                />
              )}

              {(item.type === "choice" || item.type === "open-choice") && item.answerOption && (
                <div>
                  {item.answerOption.map((opt: any) => (
                    <button
                      key={opt.value}
                      style={optionBtn(answers[item.linkId] === opt.value)}
                      onClick={() => handleAnswer(item.linkId, opt.value)}
                    >
                      {opt.display}
                    </button>
                  ))}
                </div>
              )}

              {item.redFlag && answers[item.linkId] === true && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px", marginTop: "8px", fontSize: "15px", color: "#991b1b" }}>
                  Please let a staff member know about this symptom.
                </div>
              )}
            </div>
          ))}

          <button
            style={{ ...bigBtn, background: "#2563eb", color: "#fff" }}
            onClick={submitBatch}
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Next"}
          </button>

          <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
            <button
              style={{ ...bigBtn, background: "#e5e7eb", color: "#374151", flex: 1 }}
              onClick={getResumeToken}
            >
              Continue on Phone
            </button>
          </div>
        </div>
      ) : !completed && (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "12px" }}>All Done!</h2>
          <p style={{ fontSize: "16px", color: "#6b7280", marginBottom: "24px" }}>
            Tap Submit to send your answers to your care team.
          </p>
          <button
            style={{ ...bigBtn, background: "#10b981", color: "#fff" }}
            onClick={submitIntake}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      )}
    </div>
  );
}
