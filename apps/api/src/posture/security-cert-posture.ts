/**
 * security-cert-posture.ts -- Wave 16 Security Certification Posture (Phase 345)
 *
 * Runtime introspection of all Wave 16 security subsystems.
 * Returns per-phase readiness gates for the /posture/security-cert endpoint.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface SecurityGate {
  name: string;
  pass: boolean;
  detail: string;
}

export interface SecurityCertPosture {
  score: number;
  gates: SecurityGate[];
  summary: string;
  phases: Record<string, { pass: boolean; gates: SecurityGate[] }>;
}

function fileExists(relPath: string): boolean {
  const root = join(process.cwd(), '..', '..');
  const rootAlt = process.cwd();
  return existsSync(join(root, relPath)) || existsSync(join(rootAlt, relPath));
}

function checkPhase338(): SecurityGate[] {
  const gates: SecurityGate[] = [];
  const files = [
    'apps/api/src/auth/session-security.ts',
    'apps/api/src/auth/step-up-auth.ts',
    'apps/api/src/auth/mfa-enforcement.ts',
    'apps/api/src/routes/session-management.ts',
  ];
  for (const f of files) {
    const name = f.split('/').pop() ?? f;
    gates.push({ name: `p338_${name}`, pass: fileExists(f), detail: f });
  }
  return gates;
}

function checkPhase339(): SecurityGate[] {
  const gates: SecurityGate[] = [];
  const files = ['apps/api/src/auth/scim-server.ts', 'apps/api/src/routes/scim-routes.ts'];
  for (const f of files) {
    const name = f.split('/').pop() ?? f;
    gates.push({ name: `p339_${name}`, pass: fileExists(f), detail: f });
  }
  return gates;
}

function checkPhase340(): SecurityGate[] {
  const gates: SecurityGate[] = [];
  const files = ['apps/api/src/auth/abac-attributes.ts', 'apps/api/src/auth/abac-engine.ts'];
  for (const f of files) {
    const name = f.split('/').pop() ?? f;
    gates.push({ name: `p340_${name}`, pass: fileExists(f), detail: f });
  }
  return gates;
}

function checkPhase341(): SecurityGate[] {
  const gates: SecurityGate[] = [];
  const files = [
    'apps/api/src/auth/key-provider.ts',
    'apps/api/src/auth/envelope-encryption.ts',
    'apps/api/src/auth/rotation-manager.ts',
    'apps/api/src/routes/secrets-routes.ts',
  ];
  for (const f of files) {
    const name = f.split('/').pop() ?? f;
    gates.push({ name: `p341_${name}`, pass: fileExists(f), detail: f });
  }
  return gates;
}

function checkPhase342(): SecurityGate[] {
  const gates: SecurityGate[] = [];
  const files = [
    'apps/api/src/auth/tenant-security-policy.ts',
    'apps/api/src/routes/tenant-security-routes.ts',
  ];
  for (const f of files) {
    const name = f.split('/').pop() ?? f;
    gates.push({ name: `p342_${name}`, pass: fileExists(f), detail: f });
  }
  return gates;
}

function checkPhase343(): SecurityGate[] {
  const gates: SecurityGate[] = [];
  const files = [
    'apps/api/src/auth/privacy-segmentation.ts',
    'apps/api/src/routes/privacy-routes.ts',
  ];
  for (const f of files) {
    const name = f.split('/').pop() ?? f;
    gates.push({ name: `p343_${name}`, pass: fileExists(f), detail: f });
  }
  return gates;
}

function checkPhase344(): SecurityGate[] {
  const gates: SecurityGate[] = [];
  const files = [
    'apps/api/src/auth/siem-sink.ts',
    'apps/api/src/auth/security-alerts.ts',
    'apps/api/src/routes/siem-routes.ts',
  ];
  for (const f of files) {
    const name = f.split('/').pop() ?? f;
    gates.push({ name: `p344_${name}`, pass: fileExists(f), detail: f });
  }
  return gates;
}

export function checkSecurityCertPosture(): SecurityCertPosture {
  const phaseChecks: Record<string, SecurityGate[]> = {
    '338-identity': checkPhase338(),
    '339-scim': checkPhase339(),
    '340-abac': checkPhase340(),
    '341-secrets': checkPhase341(),
    '342-tenant-security': checkPhase342(),
    '343-privacy': checkPhase343(),
    '344-siem': checkPhase344(),
  };

  const allGates: SecurityGate[] = [];
  const phases: Record<string, { pass: boolean; gates: SecurityGate[] }> = {};

  for (const [key, gates] of Object.entries(phaseChecks)) {
    allGates.push(...gates);
    phases[key] = {
      pass: gates.every((g) => g.pass),
      gates,
    };
  }

  const passCount = allGates.filter((g) => g.pass).length;
  const score = allGates.length > 0 ? Math.round((passCount / allGates.length) * 100) : 0;

  return {
    score,
    gates: allGates,
    summary: `Wave 16 Security: ${passCount}/${allGates.length} gates pass (score: ${score}%)`,
    phases,
  };
}
