/**
 * Telehealth Provider Adapter — Phase 30
 *
 * Provider-agnostic interface for video visit infrastructure.
 * Default: self-hosted Jitsi Meet (no vendor lock-in).
 * Future: Zoom, Twilio, WebEx stubs ready for implementation.
 *
 * Design principles:
 * - No PHI in meeting URLs or room names
 * - Short-lived room tokens (max 4h)
 * - Provider is selected by TELEHEALTH_PROVIDER env var
 * - All providers must implement the same interface
 */

/* ------------------------------------------------------------------ */
/* Room lifecycle                                                       */
/* ------------------------------------------------------------------ */

export type RoomStatus = "created" | "waiting" | "active" | "ended";

export interface TelehealthRoom {
  /** Opaque room identifier (no PHI) */
  roomId: string;
  /** Appointment ID this room is linked to */
  appointmentId: string;
  /** Current lifecycle state */
  status: RoomStatus;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last status change */
  updatedAt: string;
  /** ISO timestamp when room expires (max 4h from creation) */
  expiresAt: string;
  /** Provider-specific metadata (no PHI) */
  providerMeta?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Participant roles                                                     */
/* ------------------------------------------------------------------ */

export type ParticipantRole = "patient" | "provider" | "interpreter" | "caregiver";

export interface RoomParticipant {
  /** Display name shown in video UI */
  displayName: string;
  /** Role determines permissions (e.g., provider can end room) */
  role: ParticipantRole;
}

/* ------------------------------------------------------------------ */
/* Provider adapter interface                                           */
/* ------------------------------------------------------------------ */

export interface CreateRoomResult {
  roomId: string;
  /** Provider-specific metadata (no PHI) */
  meta?: Record<string, unknown>;
}

export interface JoinUrlResult {
  /** Full URL for participant to join */
  url: string;
  /** Optional short-lived JWT for authenticated join */
  token?: string;
  /** Seconds until this URL/token expires */
  expiresInSeconds: number;
}

/**
 * TelehealthProvider — adapter interface for video visit providers.
 *
 * Implementations must:
 * 1. Never embed PHI in URLs, room names, or tokens
 * 2. Generate time-limited join URLs
 * 3. Support room lifecycle (create → join → end)
 * 4. Be stateless — room state is managed by room-store.ts
 */
export interface TelehealthProvider {
  /** Human-readable provider name (e.g., "Jitsi", "Zoom") */
  readonly name: string;

  /**
   * Create a new video room for an appointment.
   * Room name must be opaque (no patient names, no DFN).
   */
  createRoom(appointmentId: string): Promise<CreateRoomResult>;

  /**
   * Generate a join URL for a participant.
   * URL must be short-lived and role-aware.
   */
  joinUrl(
    roomId: string,
    participant: RoomParticipant
  ): Promise<JoinUrlResult>;

  /**
   * End/destroy a room. Provider should clean up resources.
   */
  endRoom(roomId: string): Promise<void>;

  /**
   * Check if the provider backend is reachable.
   * Returns true if healthy, false otherwise.
   */
  healthCheck(): Promise<boolean>;
}

/* ------------------------------------------------------------------ */
/* Device check                                                         */
/* ------------------------------------------------------------------ */

export interface DeviceCheckResult {
  camera: "granted" | "denied" | "not_found" | "unknown";
  microphone: "granted" | "denied" | "not_found" | "unknown";
  speaker: "available" | "not_found" | "unknown";
  browser: "supported" | "unsupported";
  network: "good" | "fair" | "poor" | "unknown";
  webrtc: boolean;
  /** Overall readiness */
  ready: boolean;
  /** Human-readable issues */
  issues: string[];
}

/* ------------------------------------------------------------------ */
/* Waiting room                                                         */
/* ------------------------------------------------------------------ */

export type WaitingRoomStatus =
  | "not_started"       // Room exists but visit hasn't begun
  | "patient_waiting"   // Patient is in the waiting room
  | "provider_joined"   // Provider has connected
  | "in_progress"       // Both parties connected
  | "completed";        // Visit ended

export interface WaitingRoomState {
  roomId: string;
  appointmentId: string;
  status: WaitingRoomStatus;
  patientJoinedAt?: string;
  providerJoinedAt?: string;
  estimatedWaitMinutes?: number;
  queuePosition?: number;
}
