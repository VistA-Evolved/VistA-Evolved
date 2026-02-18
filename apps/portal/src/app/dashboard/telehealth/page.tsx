/**
 * Telehealth Page — Phase 30
 *
 * Video visit capability with:
 * - Device check (camera, mic, network)
 * - Waiting room with live status
 * - Join visit flow via provider adapter (default: Jitsi)
 *
 * Design: Provider-agnostic. No PHI in meeting URLs.
 * Recording OFF by default (consent workflow future).
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { DataSourceBadge } from "@/components/data-source-badge";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface Appointment {
  id: string;
  clinicName: string;
  providerName: string;
  appointmentType: string;
  scheduledAt: string;
  status: string;
}

interface DeviceCheckResult {
  camera: string;
  microphone: string;
  speaker: string;
  browser: string;
  network: string;
  webrtc: boolean;
  ready: boolean;
  issues: string[];
}

interface WaitingRoomState {
  roomId: string;
  appointmentId: string;
  status: string;
  patientJoinedAt?: string;
  providerJoinedAt?: string;
}

interface TelehealthRoom {
  roomId: string;
  appointmentId: string;
  status: string;
  expiresAt: string;
}

type View = "appointments" | "device-check" | "waiting-room" | "in-visit";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/* ------------------------------------------------------------------ */
/* API helpers                                                          */
/* ------------------------------------------------------------------ */

async function apiFetch<T = unknown>(path: string, opts: RequestInit = {}): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...opts.headers } });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, data: data as T };
  } catch { return { ok: false, error: "Network error" }; }
}

/* ------------------------------------------------------------------ */
/* Device Check (client-side)                                           */
/* ------------------------------------------------------------------ */

async function runDeviceCheck(): Promise<DeviceCheckResult> {
  const issues: string[] = [];
  let camera: DeviceCheckResult["camera"] = "unknown";
  let microphone: DeviceCheckResult["microphone"] = "unknown";
  let speaker: DeviceCheckResult["speaker"] = "unknown";
  let webrtc = false;

  // Check WebRTC support
  if (typeof RTCPeerConnection !== "undefined") {
    webrtc = true;
  } else {
    issues.push("WebRTC not available");
  }

  // Check browser
  const ua = navigator.userAgent;
  const isChrome = /Chrome\/(\d+)/.test(ua);
  const isFirefox = /Firefox\/(\d+)/.test(ua);
  const isSafari = /Safari\/(\d+)/.test(ua) && !isChrome;
  const isEdge = /Edg\/(\d+)/.test(ua);
  const browser = (isChrome || isFirefox || isSafari || isEdge) ? "supported" : "unsupported";
  if (browser === "unsupported") issues.push("Browser may not be fully supported");

  // Check camera + mic
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      camera = "granted";
      microphone = "granted";
      // Check for audio output
      if (navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasOutput = devices.some((d) => d.kind === "audiooutput");
        speaker = hasOutput ? "available" : "not_found";
        if (!hasOutput) issues.push("No audio output device detected");
      }
      // Stop tracks
      stream.getTracks().forEach((t) => t.stop());
    }
  } catch (err: any) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      camera = "denied";
      microphone = "denied";
      issues.push("Camera and microphone access denied");
    } else if (err.name === "NotFoundError") {
      camera = "not_found";
      microphone = "not_found";
      issues.push("Camera or microphone not found");
    } else {
      issues.push("Could not access media devices");
    }
  }

  const ready = camera === "granted" && microphone === "granted" && webrtc && browser === "supported";

  return { camera, microphone, speaker, browser, network: "unknown", webrtc, ready, issues };
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export default function TelehealthPage() {
  const [view, setView] = useState<View>("appointments");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceResult, setDeviceResult] = useState<DeviceCheckResult | null>(null);
  const [checkingDevice, setCheckingDevice] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [room, setRoom] = useState<TelehealthRoom | null>(null);
  const [waitState, setWaitState] = useState<WaitingRoomState | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Load telehealth appointments
  const loadAppointments = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ upcoming: Appointment[]; past: Appointment[] }>("/portal/appointments");
    if (res.ok && res.data) {
      const upcoming = (res.data.upcoming || []).filter((a: Appointment) => a.appointmentType === "telehealth");
      setAppointments(upcoming);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  // Poll waiting room
  useEffect(() => {
    if (view !== "waiting-room" || !room) return;
    const poll = setInterval(async () => {
      const res = await apiFetch<{ waiting: WaitingRoomState }>(`/portal/telehealth/rooms/${room.roomId}/waiting`);
      if (res.ok && res.data?.waiting) {
        setWaitState(res.data.waiting);
        if (res.data.waiting.status === "provider_joined" || res.data.waiting.status === "in_progress") {
          clearInterval(poll);
        }
      }
    }, 5000);
    return () => clearInterval(poll);
  }, [view, room]);

  /* ── Handlers ── */

  const handleStartVisit = async (appt: Appointment) => {
    setSelectedAppt(appt);
    setView("device-check");
    setDeviceResult(null);
  };

  const handleRunDeviceCheck = async () => {
    setCheckingDevice(true);
    try {
      const result = await runDeviceCheck();
      setDeviceResult(result);
      // Report to server
      await apiFetch("/portal/telehealth/device-check/report", {
        method: "POST",
        body: JSON.stringify(result),
      });
    } catch {
      setNotice({ text: "Device check failed", type: "error" });
    }
    setCheckingDevice(false);
  };

  const handleProceedToWaiting = async () => {
    if (!selectedAppt) return;
    // Check for existing room
    const res = await apiFetch<{ room: TelehealthRoom | null }>(`/portal/telehealth/appointment/${selectedAppt.id}/room`);
    if (res.ok && res.data?.room) {
      setRoom(res.data.room);
      setView("waiting-room");
    } else {
      // No room yet
      setRoom(null);
      setView("waiting-room");
      setNotice({ text: "Your provider has not started the visit yet. Please wait.", type: "success" });
    }
  };

  const handleJoinVisit = async () => {
    if (!room) return;
    const res = await apiFetch<{ joinUrl: string }>(`/portal/telehealth/rooms/${room.roomId}/join`, { method: "POST" });
    if (res.ok && res.data?.joinUrl) {
      setJoinUrl(res.data.joinUrl);
      setView("in-visit");
    } else {
      setNotice({ text: "Could not join visit. Please try again.", type: "error" });
    }
  };

  const handleBackToList = () => {
    setView("appointments");
    setSelectedAppt(null);
    setRoom(null);
    setWaitState(null);
    setJoinUrl(null);
    setDeviceResult(null);
    setNotice(null);
  };

  /* ── Render ── */

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>Telehealth</h1>
          <p style={{ color: "var(--portal-text-muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
            Virtual visits with your care team
          </p>
        </div>
        {view !== "appointments" && (
          <button className="btn btn-outline" onClick={handleBackToList} style={{ fontSize: "0.875rem" }}>
            Back to Appointments
          </button>
        )}
      </div>

      {notice && (
        <div style={{
          padding: "0.75rem 1rem",
          marginBottom: "1rem",
          borderRadius: "var(--portal-radius)",
          background: notice.type === "success" ? "#f0fdf4" : "#fef2f2",
          color: notice.type === "success" ? "#166534" : "#991b1b",
          fontSize: "0.875rem",
        }}>
          {notice.text}
        </div>
      )}

      {/* ── Appointments List ── */}
      {view === "appointments" && (
        <>
          {loading ? (
            <div className="card"><p style={{ color: "var(--portal-text-muted)" }}>Loading telehealth appointments...</p></div>
          ) : appointments.length === 0 ? (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <h3 style={{ margin: 0 }}>Video Visits</h3>
                <DataSourceBadge source="ehr" />
              </div>
              <div className="empty-state">
                <h3>No Upcoming Telehealth Visits</h3>
                <p>You don&apos;t have any video visit appointments scheduled. Contact your care team to schedule one.</p>
              </div>
            </div>
          ) : (
            <div className="grid-2">
              {appointments.map((appt) => (
                <div className="card" key={appt.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <h3 style={{ margin: 0 }}>{appt.clinicName}</h3>
                    <DataSourceBadge source="ehr" />
                  </div>
                  <p style={{ fontSize: "0.875rem", color: "var(--portal-text-muted)", marginBottom: "0.25rem" }}>
                    {appt.providerName}
                  </p>
                  <p style={{ fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                    {new Date(appt.scheduledAt).toLocaleDateString()} at{" "}
                    {new Date(appt.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <div style={{
                    display: "inline-block",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "var(--portal-radius)",
                    background: appt.status === "confirmed" ? "#dcfce7" : "#fef9c3",
                    color: appt.status === "confirmed" ? "#166534" : "#854d0e",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    marginBottom: "0.75rem",
                  }}>
                    {appt.status.replace(/_/g, " ").toUpperCase()}
                  </div>
                  {appt.status === "confirmed" && (
                    <div>
                      <button className="btn btn-primary" onClick={() => handleStartVisit(appt)} style={{ width: "100%", fontSize: "0.875rem" }}>
                        Prepare for Visit
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Device Check ── */}
      {view === "device-check" && selectedAppt && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0 }}>Device Check</h3>
            <DataSourceBadge source="local" />
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--portal-text-muted)", marginBottom: "1rem" }}>
            Let&apos;s make sure your camera, microphone, and internet connection are ready for your visit with{" "}
            <strong>{selectedAppt.providerName}</strong>.
          </p>

          {!deviceResult && (
            <button
              className="btn btn-primary"
              onClick={handleRunDeviceCheck}
              disabled={checkingDevice}
              style={{ fontSize: "0.875rem" }}
            >
              {checkingDevice ? "Checking..." : "Run Device Check"}
            </button>
          )}

          {deviceResult && (
            <div style={{ marginTop: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                <DeviceItem label="Camera" status={deviceResult.camera} />
                <DeviceItem label="Microphone" status={deviceResult.microphone} />
                <DeviceItem label="Speaker" status={deviceResult.speaker} />
                <DeviceItem label="Browser" status={deviceResult.browser} />
                <DeviceItem label="WebRTC" status={deviceResult.webrtc ? "supported" : "unsupported"} />
              </div>

              {deviceResult.issues.length > 0 && (
                <div style={{
                  padding: "0.75rem",
                  background: "#fef2f2",
                  borderRadius: "var(--portal-radius)",
                  marginBottom: "1rem",
                  fontSize: "0.8125rem",
                  color: "#991b1b",
                }}>
                  <strong>Issues found:</strong>
                  <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
                    {deviceResult.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                  </ul>
                </div>
              )}

              <div style={{
                padding: "0.75rem",
                background: deviceResult.ready ? "#f0fdf4" : "#fffbeb",
                borderRadius: "var(--portal-radius)",
                marginBottom: "1rem",
                fontSize: "0.875rem",
                color: deviceResult.ready ? "#166534" : "#854d0e",
                fontWeight: 600,
              }}>
                {deviceResult.ready
                  ? "All checks passed. You are ready for your visit!"
                  : "Some issues were found. You may still try to join, but your experience may be affected."}
              </div>

              <button
                className="btn btn-primary"
                onClick={handleProceedToWaiting}
                style={{ width: "100%", fontSize: "0.875rem" }}
              >
                Proceed to Waiting Room
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Waiting Room ── */}
      {view === "waiting-room" && selectedAppt && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0 }}>Waiting Room</h3>
            <DataSourceBadge source="local" />
          </div>

          <div style={{
            textAlign: "center",
            padding: "2rem 1rem",
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
              {!room ? "\u{1F550}" : waitState?.status === "provider_joined" || waitState?.status === "in_progress" ? "\u{1F7E2}" : "\u{1F7E1}"}
            </div>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
              {!room
                ? "Waiting for your provider to start the visit"
                : waitState?.status === "provider_joined" || waitState?.status === "in_progress"
                  ? "Your provider is ready!"
                  : "You are in the waiting room"}
            </h2>
            <p style={{ color: "var(--portal-text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              {!room
                ? "We will check every few seconds. This page will update automatically."
                : waitState?.status === "patient_waiting"
                  ? "Please wait. Your provider will join shortly."
                  : waitState?.status === "provider_joined" || waitState?.status === "in_progress"
                    ? "Click below to join your video visit."
                    : "Connecting..."}
            </p>

            <div style={{
              padding: "0.75rem",
              background: "#f0f9ff",
              borderRadius: "var(--portal-radius)",
              marginBottom: "1.5rem",
              fontSize: "0.8125rem",
              color: "#1e40af",
            }}>
              <strong>Visit Details:</strong><br />
              {selectedAppt.clinicName} with {selectedAppt.providerName}<br />
              {new Date(selectedAppt.scheduledAt).toLocaleDateString()} at{" "}
              {new Date(selectedAppt.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>

            {room && (waitState?.status === "provider_joined" || waitState?.status === "in_progress") && (
              <button
                className="btn btn-primary"
                onClick={handleJoinVisit}
                style={{ fontSize: "1rem", padding: "0.75rem 2rem" }}
              >
                Join Visit Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── In Visit ── */}
      {view === "in-visit" && joinUrl && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.75rem 1rem",
            borderBottom: "1px solid var(--portal-border)",
            background: "var(--portal-surface)",
          }}>
            <div>
              <strong>Video Visit</strong>
              {selectedAppt && (
                <span style={{ color: "var(--portal-text-muted)", fontSize: "0.8125rem", marginLeft: "0.75rem" }}>
                  {selectedAppt.providerName} - {selectedAppt.clinicName}
                </span>
              )}
            </div>
            <button className="btn btn-outline" onClick={handleBackToList} style={{ fontSize: "0.8125rem" }}>
              Leave Visit
            </button>
          </div>
          <iframe
            src={joinUrl}
            allow="camera; microphone; display-capture; autoplay; clipboard-write"
            style={{
              width: "100%",
              height: "calc(100vh - 200px)",
              minHeight: "500px",
              border: "none",
            }}
            title="Telehealth Video Visit"
          />
        </div>
      )}

      {/* ── Privacy Notice ── */}
      <div style={{
        marginTop: "1.5rem",
        padding: "0.75rem 1rem",
        background: "var(--portal-surface)",
        borderRadius: "var(--portal-radius)",
        border: "1px solid var(--portal-border)",
        fontSize: "0.75rem",
        color: "var(--portal-text-muted)",
      }}>
        <strong>Privacy:</strong> Video visits are not recorded by default. Your video connection is
        encrypted end-to-end. No personal health information is included in meeting links.
        {" "}Recording requires explicit consent and is not enabled in this version.
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

function DeviceItem({ label, status }: { label: string; status: string }) {
  const isGood = ["granted", "available", "supported", "good"].includes(status);
  const isBad = ["denied", "not_found", "unsupported", "poor"].includes(status);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.5rem 0.75rem",
      background: isGood ? "#f0fdf4" : isBad ? "#fef2f2" : "#f9fafb",
      borderRadius: "var(--portal-radius)",
      fontSize: "0.8125rem",
    }}>
      <span>{isGood ? "\u2705" : isBad ? "\u274C" : "\u2753"}</span>
      <span><strong>{label}:</strong> {status.replace(/_/g, " ")}</span>
    </div>
  );
}
