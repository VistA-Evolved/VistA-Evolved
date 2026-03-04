/**
 * Device Check Service — Phase 30
 *
 * Server-side component for telehealth device compatibility checking.
 * The actual media device enumeration happens client-side (browser APIs).
 * This service provides:
 * 1. Supported browser/version list
 * 2. Minimum requirements spec
 * 3. WebRTC TURN/STUN config for network test
 *
 * Client-side device check flow:
 * 1. GET /telehealth/device-check/requirements → browser/version requirements
 * 2. Client runs navigator.mediaDevices.enumerateDevices()
 * 3. Client runs RTCPeerConnection test with STUN servers
 * 4. POST /telehealth/device-check/report → logs result for audit
 */

import type { DeviceCheckResult } from './types.js';

/* ------------------------------------------------------------------ */
/* Supported browsers                                                   */
/* ------------------------------------------------------------------ */

export interface BrowserRequirement {
  name: string;
  minVersion: number;
}

const SUPPORTED_BROWSERS: BrowserRequirement[] = [
  { name: 'Chrome', minVersion: 90 },
  { name: 'Firefox', minVersion: 88 },
  { name: 'Safari', minVersion: 15 },
  { name: 'Edge', minVersion: 90 },
];

/* ------------------------------------------------------------------ */
/* STUN/TURN config                                                     */
/* ------------------------------------------------------------------ */

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/**
 * Get ICE server configuration for WebRTC connectivity test.
 * Uses public Google STUN servers by default.
 * Self-hosted TURN can be configured via env vars.
 */
export function getIceServers(): IceServer[] {
  const servers: IceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  // Optional self-hosted TURN server
  const turnUrl = process.env.TELEHEALTH_TURN_URL;
  const turnUser = process.env.TELEHEALTH_TURN_USERNAME;
  const turnCred = process.env.TELEHEALTH_TURN_CREDENTIAL;

  if (turnUrl && turnUser && turnCred) {
    servers.push({
      urls: turnUrl,
      username: turnUser,
      credential: turnCred,
    });
  }

  return servers;
}

/* ------------------------------------------------------------------ */
/* Requirements response                                                */
/* ------------------------------------------------------------------ */

export interface DeviceRequirements {
  supportedBrowsers: BrowserRequirement[];
  iceServers: IceServer[];
  minBandwidthKbps: number;
  features: string[];
}

export function getDeviceRequirements(): DeviceRequirements {
  return {
    supportedBrowsers: SUPPORTED_BROWSERS,
    iceServers: getIceServers(),
    minBandwidthKbps: 500,
    features: ['getUserMedia', 'RTCPeerConnection', 'MediaStream', 'enumerateDevices'],
  };
}

/* ------------------------------------------------------------------ */
/* Validate client report                                               */
/* ------------------------------------------------------------------ */

/**
 * Validate a client-submitted device check report.
 * Returns sanitized result with overall readiness assessment.
 */
export function validateDeviceReport(report: Partial<DeviceCheckResult>): DeviceCheckResult {
  const issues: string[] = [];

  const camera = report.camera || 'unknown';
  const microphone = report.microphone || 'unknown';
  const speaker = report.speaker || 'unknown';
  const browser = report.browser || 'unknown';
  const network = report.network || 'unknown';
  const webrtc = report.webrtc ?? false;

  if (camera === 'denied') issues.push('Camera access denied');
  if (camera === 'not_found') issues.push('No camera detected');
  if (microphone === 'denied') issues.push('Microphone access denied');
  if (microphone === 'not_found') issues.push('No microphone detected');
  if (speaker === 'not_found') issues.push('No audio output detected');
  if (browser === 'unsupported') issues.push('Browser not supported for video visits');
  if (network === 'poor') issues.push('Network connection may be too slow');
  if (!webrtc) issues.push('WebRTC not available in this browser');

  const ready =
    camera === 'granted' &&
    microphone === 'granted' &&
    (speaker === 'available' || speaker === 'unknown') &&
    browser !== 'unsupported' &&
    network !== 'poor' &&
    webrtc;

  return {
    camera: camera as DeviceCheckResult['camera'],
    microphone: microphone as DeviceCheckResult['microphone'],
    speaker: speaker as DeviceCheckResult['speaker'],
    browser: browser as DeviceCheckResult['browser'],
    network: network as DeviceCheckResult['network'],
    webrtc,
    ready,
    issues,
  };
}
