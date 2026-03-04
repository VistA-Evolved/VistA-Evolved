/**
 * Phase 234 -- FHIR Paging + Bundle Links Tests.
 *
 * Tests for toPagedSearchBundle pagination logic.
 */

import { describe, it, expect } from 'vitest';
import { toPagedSearchBundle } from '../src/fhir/mappers.js';
import type { FhirResource } from '../src/fhir/types.js';

/* ================================================================== */
/* Fixtures                                                             */
/* ================================================================== */

function makeResources(n: number): FhirResource[] {
  return Array.from({ length: n }, (_, i) => ({
    resourceType: 'Patient',
    id: `pat-${i + 1}`,
  })) as unknown as FhirResource[];
}

/* ================================================================== */
/* toPagedSearchBundle                                                  */
/* ================================================================== */

describe('toPagedSearchBundle', () => {
  const baseUrl = 'http://localhost:3001';

  it('returns first page with next link when more results exist', () => {
    const resources = makeResources(50);
    const bundle = toPagedSearchBundle(resources, baseUrl, 'Patient', {
      offset: 0,
      count: 20,
    });

    expect(bundle.total).toBe(50);
    expect(bundle.entry).toHaveLength(20);
    expect(bundle.link).toBeDefined();

    const self = bundle.link!.find((l) => l.relation === 'self');
    expect(self?.url).toContain('_offset=0');
    expect(self?.url).toContain('_count=20');

    const next = bundle.link!.find((l) => l.relation === 'next');
    expect(next?.url).toContain('_offset=20');
    expect(next?.url).toContain('_count=20');

    const prev = bundle.link!.find((l) => l.relation === 'previous');
    expect(prev).toBeUndefined(); // No previous on first page
  });

  it('returns middle page with both next and previous links', () => {
    const resources = makeResources(50);
    const bundle = toPagedSearchBundle(resources, baseUrl, 'Observation', {
      offset: 20,
      count: 20,
    });

    expect(bundle.total).toBe(50);
    expect(bundle.entry).toHaveLength(20);

    const next = bundle.link!.find((l) => l.relation === 'next');
    expect(next?.url).toContain('_offset=40');

    const prev = bundle.link!.find((l) => l.relation === 'previous');
    expect(prev?.url).toContain('_offset=0');
  });

  it('returns last page with previous link but no next', () => {
    const resources = makeResources(50);
    const bundle = toPagedSearchBundle(resources, baseUrl, 'Encounter', {
      offset: 40,
      count: 20,
    });

    expect(bundle.total).toBe(50);
    expect(bundle.entry).toHaveLength(10); // Only 10 remaining

    const next = bundle.link!.find((l) => l.relation === 'next');
    expect(next).toBeUndefined();

    const prev = bundle.link!.find((l) => l.relation === 'previous');
    expect(prev?.url).toContain('_offset=20');
  });

  it('preserves query string in paging links', () => {
    const resources = makeResources(30);
    const bundle = toPagedSearchBundle(resources, baseUrl, 'AllergyIntolerance', {
      offset: 0,
      count: 10,
      queryString: 'patient=3&clinical-status=active',
    });

    const next = bundle.link!.find((l) => l.relation === 'next');
    expect(next?.url).toContain('patient=3');
    expect(next?.url).toContain('clinical-status=active');
    expect(next?.url).toContain('_offset=10');
  });

  it('handles empty results', () => {
    const bundle = toPagedSearchBundle([], baseUrl, 'Condition');

    expect(bundle.total).toBe(0);
    expect(bundle.entry).toHaveLength(0);

    const next = bundle.link!.find((l) => l.relation === 'next');
    expect(next).toBeUndefined();
  });

  it('defaults to count=20 offset=0', () => {
    const resources = makeResources(25);
    const bundle = toPagedSearchBundle(resources, baseUrl, 'MedicationRequest');

    expect(bundle.entry).toHaveLength(20);
    expect(bundle.total).toBe(25);

    const next = bundle.link!.find((l) => l.relation === 'next');
    expect(next?.url).toContain('_offset=20');
  });

  it('clamps count to max 100', () => {
    const resources = makeResources(150);
    const bundle = toPagedSearchBundle(resources, baseUrl, 'Patient', {
      count: 200,
    });

    expect(bundle.entry).toHaveLength(100);
  });

  it('each entry has fullUrl and search.mode', () => {
    const resources = makeResources(3);
    const bundle = toPagedSearchBundle(resources, baseUrl, 'Patient', { count: 10 });

    for (const entry of bundle.entry!) {
      expect(entry.fullUrl).toMatch(/^http:\/\/localhost:3001\/fhir\/Patient\/pat-\d+$/);
      expect(entry.search?.mode).toBe('match');
    }
  });
});
