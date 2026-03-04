/**
 * DR Certification -- Static Analysis Test Suite (Phase 255)
 *
 * Validates disaster recovery infrastructure exists and is well-structured.
 * Does NOT perform live backup/restore (that's the dr-nightly.yml CI job).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '../../..');

function fileExists(relPath: string): boolean {
  return existsSync(join(ROOT, relPath));
}

function readFile(relPath: string): string {
  const full = join(ROOT, relPath);
  if (!existsSync(full)) return '';
  return readFileSync(full, 'utf-8');
}

describe('DR Certification -- Phase 255', () => {
  describe('Backup Scripts', () => {
    it('DR backup script exists', () => {
      expect(fileExists('scripts/dr/backup.mjs')).toBe(true);
    });

    it('DR restore-verify script exists', () => {
      expect(fileExists('scripts/dr/restore-verify.mjs')).toBe(true);
    });

    it('legacy backup-restore script exists', () => {
      expect(fileExists('scripts/backup-restore.mjs')).toBe(true);
    });

    it('backup uses pg_dump', () => {
      const src = readFile('scripts/dr/backup.mjs');
      expect(src).toMatch(/pg_dump/);
    });

    it('backup creates SHA-256 checksums', () => {
      const src = readFile('scripts/dr/backup.mjs');
      expect(src).toMatch(/sha256|createHash.*sha256/i);
    });

    it('backup creates manifest', () => {
      const src = readFile('scripts/dr/backup.mjs');
      expect(src).toMatch(/manifest/);
    });

    it('backup redacts credentials', () => {
      const src = readFile('scripts/dr/backup.mjs');
      expect(src).toMatch(/redact|PLATFORM_PG_URL/i);
    });
  });

  describe('Restore Verification', () => {
    it('restore-verify implements schema integrity probe', () => {
      const src = readFile('scripts/dr/restore-verify.mjs');
      expect(src).toMatch(/schema.*integrit|schema_integrit/i);
    });

    it('restore-verify implements synthetic data probe', () => {
      const src = readFile('scripts/dr/restore-verify.mjs');
      expect(src).toMatch(/synthetic|INSERT/);
    });

    it('restore-verify checks RLS', () => {
      const src = readFile('scripts/dr/restore-verify.mjs');
      expect(src).toMatch(/rls|RLS|row.*level/i);
    });

    it('restore-verify detects schema drift', () => {
      const src = readFile('scripts/dr/restore-verify.mjs');
      expect(src).toMatch(/drift/i);
    });

    it('restore-verify validates checksums', () => {
      const src = readFile('scripts/dr/restore-verify.mjs');
      expect(src).toMatch(/checksum|sha256|manifest/i);
    });
  });

  describe('CI/CD Integration', () => {
    it('DR nightly workflow exists', () => {
      expect(fileExists('.github/workflows/dr-nightly.yml')).toBe(true);
    });

    it('DR nightly runs at 03:00 UTC', () => {
      const src = readFile('.github/workflows/dr-nightly.yml');
      expect(src).toMatch(/cron.*0\s+3/);
    });

    it('DR nightly includes PG service container', () => {
      const src = readFile('.github/workflows/dr-nightly.yml');
      expect(src).toMatch(/postgres/i);
    });

    it('DR nightly uploads artifacts', () => {
      const src = readFile('.github/workflows/dr-nightly.yml');
      expect(src).toMatch(/upload-artifact/);
    });
  });

  describe('Runbooks', () => {
    it('disaster-recovery runbook exists', () => {
      expect(fileExists('docs/runbooks/disaster-recovery.md')).toBe(true);
    });

    it('pg-backup-pitr runbook exists', () => {
      expect(fileExists('docs/runbooks/pg-backup-pitr.md')).toBe(true);
    });

    it('incident-pg-outage runbook exists', () => {
      expect(fileExists('docs/runbooks/incident-pg-outage.md')).toBe(true);
    });
  });

  describe('Gauntlet Gate G16', () => {
    it('G16 DR gate exists', () => {
      expect(fileExists('qa/gauntlet/gates/g16-dr-chaos.mjs')).toBe(true);
    });

    it('G16 checks backup script content', () => {
      const src = readFile('qa/gauntlet/gates/g16-dr-chaos.mjs');
      expect(src).toMatch(/pg_dump|backup|manifest/i);
    });
  });

  describe('Production Compose', () => {
    it('prod compose exists', () => {
      expect(fileExists('docker-compose.prod.yml')).toBe(true);
    });

    it('prod compose includes PG service', () => {
      const src = readFile('docker-compose.prod.yml');
      expect(src).toMatch(/postgres|platform-db/);
    });

    it('prod compose has PG healthcheck', () => {
      const src = readFile('docker-compose.prod.yml');
      expect(src).toMatch(/pg_isready|healthcheck/);
    });
  });

  describe('Store Policy', () => {
    it('store-policy module exists', () => {
      expect(fileExists('apps/api/src/platform/store-policy.ts')).toBe(true);
    });

    it('store policy documents in-memory stores', () => {
      const src = readFile('apps/api/src/platform/store-policy.ts');
      expect(src).toMatch(/in_memory|Map|ring_buffer/i);
    });
  });

  describe('DR Drill Infrastructure', () => {
    it('DR drill script exists', () => {
      expect(fileExists('ops/drills/run-dr-certification-drill.ps1')).toBe(true);
    });

    it('DR certification checklist exists', () => {
      expect(fileExists('ops/drills/dr-certification-checklist.md')).toBe(true);
    });

    it('checklist covers RTO/RPO', () => {
      const src = readFile('ops/drills/dr-certification-checklist.md');
      expect(src).toMatch(/RTO/);
      expect(src).toMatch(/RPO/);
    });

    it('checklist covers sign-off', () => {
      const src = readFile('ops/drills/dr-certification-checklist.md');
      expect(src).toMatch(/Sign-Off/i);
    });
  });
});
