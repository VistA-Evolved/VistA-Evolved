/**
 * Jitsi Meet Provider — Phase 30
 *
 * Default self-hostable telehealth provider using Jitsi Meet.
 * Jitsi is open-source (Apache 2.0) and can be self-hosted or
 * used via the public meet.jit.si instance for development.
 *
 * Configuration:
 * - JITSI_BASE_URL: Base URL of Jitsi instance (default: https://meet.jit.si)
 * - JITSI_APP_ID: Optional app ID for JWT auth (self-hosted with prosody)
 * - JITSI_APP_SECRET: Optional secret for signing JWTs (self-hosted)
 *
 * Room naming: Uses opaque hex token (no PHI, no patient names).
 * JWT: When JITSI_APP_SECRET is set, generates time-limited JWTs.
 *       Without it, uses unauthenticated Jitsi (suitable for dev).
 */

import { randomBytes, createHmac } from "node:crypto";
import type {
  TelehealthProvider,
  CreateRoomResult,
  JoinUrlResult,
  RoomParticipant,
} from "../types.js";

/* ------------------------------------------------------------------ */
/* Configuration                                                        */
/* ------------------------------------------------------------------ */

const JITSI_BASE_URL = process.env.JITSI_BASE_URL || "https://meet.jit.si";
const JITSI_APP_ID = process.env.JITSI_APP_ID || "";
const JITSI_APP_SECRET = process.env.JITSI_APP_SECRET || "";
/** Join URL validity in seconds */
const JOIN_URL_TTL_SECONDS = parseInt(process.env.JITSI_JOIN_TTL_SECONDS || "3600", 10);

/* ------------------------------------------------------------------ */
/* JWT helper (simple HMAC-SHA256 for Jitsi prosody)                     */
/* ------------------------------------------------------------------ */

interface JitsiJwtPayload {
  iss: string;
  sub: string;
  aud: string;
  room: string;
  exp: number;
  iat: number;
  context: {
    user: {
      name: string;
      affiliation: string;
    };
  };
}

function base64url(data: string): string {
  return Buffer.from(data)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Generate a simple HMAC-SHA256 JWT for Jitsi prosody auth.
 * Only used when JITSI_APP_SECRET is configured (self-hosted).
 */
function generateJitsiJwt(
  roomName: string,
  participant: RoomParticipant,
  ttlSeconds: number
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload: JitsiJwtPayload = {
    iss: JITSI_APP_ID,
    sub: new URL(JITSI_BASE_URL).hostname,
    aud: JITSI_APP_ID,
    room: roomName,
    iat: now,
    exp: now + ttlSeconds,
    context: {
      user: {
        name: participant.displayName,
        affiliation: participant.role === "provider" ? "owner" : "member",
      },
    },
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = createHmac("sha256", JITSI_APP_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${headerB64}.${payloadB64}.${signature}`;
}

/* ------------------------------------------------------------------ */
/* Provider implementation                                              */
/* ------------------------------------------------------------------ */

export class JitsiProvider implements TelehealthProvider {
  readonly name = "Jitsi";

  async createRoom(_appointmentId: string): Promise<CreateRoomResult> {
    // Jitsi rooms are created on-the-fly; no server-side API call needed.
    // We generate an opaque room name to avoid PHI exposure.
    const roomId = `ve-${randomBytes(12).toString("hex")}`;
    return {
      roomId,
      meta: {
        baseUrl: JITSI_BASE_URL,
        jwtEnabled: !!JITSI_APP_SECRET,
      },
    };
  }

  async joinUrl(
    roomId: string,
    participant: RoomParticipant
  ): Promise<JoinUrlResult> {
    let url = `${JITSI_BASE_URL}/${roomId}`;
    let token: string | undefined;

    // Add display name as URL param
    const params = new URLSearchParams();
    params.set("userInfo.displayName", participant.displayName);

    // If JWT auth is configured, generate a signed token
    if (JITSI_APP_SECRET) {
      token = generateJitsiJwt(roomId, participant, JOIN_URL_TTL_SECONDS);
      params.set("jwt", token);
    }

    // Jitsi config overrides for clinical use
    params.set("config.prejoinPageEnabled", "false"); // We handle our own pre-join
    params.set("config.disableDeepLinking", "true");
    params.set("config.startWithAudioMuted", participant.role === "patient" ? "true" : "false");

    // Disable recording by default (compliance — consent required)
    params.set("config.disableRecordAudioNotification", "false");
    params.set("config.localRecording.disable", "true");
    params.set("interfaceConfig.DISABLE_TRANSCRIPTION_SUBTITLES", "true");

    url += `#${params.toString()}`;

    return {
      url,
      token,
      expiresInSeconds: JOIN_URL_TTL_SECONDS,
    };
  }

  async endRoom(_roomId: string): Promise<void> {
    // Jitsi rooms auto-close when all participants leave.
    // If using prosody + JWT, the room name becomes invalid after token expiry.
    // No server-side API call needed for basic Jitsi.
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple fetch to the Jitsi base URL
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(JITSI_BASE_URL, {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.ok || res.status === 301 || res.status === 302;
    } catch {
      return false;
    }
  }
}
