# ADR: Telehealth Provider Selection

**Status:** Accepted
**Date:** 2026-03-01
**Context:** Wave 12 Phase 307 (Telehealth Provider Hardening)

## Decision

**Keep Jitsi Meet** as the default telehealth provider, with the existing
**TelehealthProvider interface** for pluggable alternatives.

## Context

VistA-Evolved needs video telehealth that:

- Integrates with clinical encounters
- Supports clinician + patient join flows
- Is self-hostable for data sovereignty
- Has no per-seat licensing

Options considered:

1. **Jitsi Meet** -- already integrated since Phase 30
2. **Zoom SDK** -- commercial, per-seat licensing
3. **Twilio Video** -- commercial, usage-based pricing
4. **Daily.co** -- commercial, API-first
5. **BBB (BigBlueButton)** -- open-source, education-focused

## Rationale

- Jitsi is already deployed with `jitsi-provider.ts` (Phase 30)
- `TelehealthProvider` interface already exists in `apps/api/src/telehealth/types.ts`
- Room lifecycle managed by `room-store.ts` with 4-hour TTL
- Phase 30 implemented: device check, waiting room, visit UI (clinician + portal)
- Jitsi is MIT-licensed, fully self-hostable
- Provider abstraction means Jitsi can be swapped without route changes

## Consequences

- Continue using Jitsi via `jitsi-provider.ts`
- Wave 12 (P307) hardens: encounter linkage, consent posture, recording controls
- `stub` provider remains for testing
- Additional providers (Zoom, Twilio) can be added by implementing `TelehealthProvider`
- No vendor lock-in due to adapter pattern

## Provider Interface Contract

```typescript
interface TelehealthProvider {
  createRoom(encounterId: string, options: RoomOptions): Promise<Room>;
  getJoinUrl(roomId: string, userRole: string): Promise<string>;
  endRoom(roomId: string): Promise<void>;
  // Optional extensions
  startRecording?(roomId: string): Promise<void>;
  stopRecording?(roomId: string): Promise<void>;
}
```

## Alternatives Rejected

| Option        | Reason                                 |
| ------------- | -------------------------------------- |
| Zoom SDK      | Per-seat licensing, not self-hostable  |
| Twilio Video  | Usage-based pricing, vendor dependency |
| Daily.co      | Commercial, less self-hosting support  |
| BigBlueButton | Education-focused, heavier than Jitsi  |
