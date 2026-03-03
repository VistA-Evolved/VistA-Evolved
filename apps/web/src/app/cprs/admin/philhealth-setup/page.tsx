'use client';

/**
 * PhilHealth Facility Setup — Phase 90
 *
 * Admin page for configuring PhilHealth eClaims 3.0 facility setup:
 *  - Facility accreditation details
 *  - Provider accreditations
 *  - Readiness checklist
 *
 * NOT CERTIFIED: This module prepares export packages for review.
 * It does NOT submit claims to PhilHealth.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE as API } from '@/lib/api-config';


interface ReadinessItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

interface ProviderAccreditation {
  providerName: string;
  prcLicenseNumber: string;
  philhealthAccreditationNumber?: string;
  specialty?: string;
  expiryDate?: string;
}

interface FacilitySetup {
  id: string;
  facilityId: string;
  facilityCode: string;
  facilityName: string;
  accreditationNumber: string;
  accreditationExpiry?: string;
  apiEndpoint?: string;
  testMode: boolean;
  providerAccreditations: ProviderAccreditation[];
  readinessChecklist: ReadinessItem[];
  integrationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function PhilHealthSetupPage() {
  const [setup, setSetup] = useState<FacilitySetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [facilityCode, setFacilityCode] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [accreditationNumber, setAccreditationNumber] = useState('');
  const [accreditationExpiry, setAccreditationExpiry] = useState('');

  // Provider form
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [newProviderName, setNewProviderName] = useState('');
  const [newPrcLicense, setNewPrcLicense] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');

  const fetchSetup = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/rcm/philhealth/setup`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setSetup(data.setup);
        setFacilityCode(data.setup.facilityCode || '');
        setFacilityName(data.setup.facilityName || '');
        setAccreditationNumber(data.setup.accreditationNumber || '');
        setAccreditationExpiry(data.setup.accreditationExpiry || '');
      } else {
        setError(data.error || 'Failed to load setup');
      }
    } catch {
      setError('Failed to connect to API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSetup(); }, [fetchSetup]);

  const handleSaveSetup = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/rcm/philhealth/setup`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ facilityCode, facilityName, accreditationNumber, accreditationExpiry }),
      });
      const data = await res.json();
      if (data.ok) {
        setSetup(data.setup);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAddProvider = async () => {
    if (!newProviderName || !newPrcLicense) return;
    try {
      const res = await fetch(`${API}/rcm/philhealth/setup/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          providerName: newProviderName,
          prcLicenseNumber: newPrcLicense,
          specialty: newSpecialty,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSetup(data.setup);
        setNewProviderName('');
        setNewPrcLicense('');
        setNewSpecialty('');
        setShowProviderForm(false);
      }
    } catch {
      setError('Failed to add provider');
    }
  };

  const handleRemoveProvider = async (prc: string) => {
    try {
      const res = await fetch(`${API}/rcm/philhealth/setup/providers/${encodeURIComponent(prc)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { ...csrfHeaders() },
      });
      const data = await res.json();
      if (data.ok) setSetup(data.setup);
    } catch {
      setError('Failed to remove provider');
    }
  };

  const handleToggleReadiness = async (itemId: string, completed: boolean) => {
    try {
      const res = await fetch(`${API}/rcm/philhealth/setup/readiness/${encodeURIComponent(itemId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ completed }),
      });
      const data = await res.json();
      if (data.ok) setSetup(data.setup);
    } catch {
      setError('Failed to update readiness');
    }
  };

  const readinessCount = setup?.readinessChecklist.filter(i => i.completed).length ?? 0;
  const readinessTotal = setup?.readinessChecklist.length ?? 0;

  if (loading) return <div style={{ padding: 24 }}>Loading PhilHealth setup...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      {/* NOT CERTIFIED banner */}
      <div style={{
        background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 6,
        padding: '12px 16px', marginBottom: 16, fontSize: 13,
      }}>
        <strong>NOT CERTIFIED</strong> -- This module generates eClaims 3.0-structured export packages
        for review and facility readiness assessment. It does NOT submit claims to PhilHealth.
        Facility certification with PhilHealth is required before real submission.
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
        PhilHealth Facility Setup
      </h2>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', borderRadius: 4, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Facility Details */}
      <section style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Facility Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ fontSize: 12 }}>
            Facility Code
            <input value={facilityCode} onChange={e => setFacilityCode(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, marginTop: 4 }}
              placeholder="H12345678" />
          </label>
          <label style={{ fontSize: 12 }}>
            Facility Name
            <input value={facilityName} onChange={e => setFacilityName(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, marginTop: 4 }}
              placeholder="Hospital Name" />
          </label>
          <label style={{ fontSize: 12 }}>
            Accreditation Number
            <input value={accreditationNumber} onChange={e => setAccreditationNumber(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 12 }}>
            Accreditation Expiry
            <input type="date" value={accreditationExpiry} onChange={e => setAccreditationExpiry(e.target.value)}
              style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, marginTop: 4 }} />
          </label>
        </div>
        <button onClick={handleSaveSetup} disabled={saving}
          style={{ marginTop: 12, padding: '6px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, cursor: 'pointer' }}>
          {saving ? 'Saving...' : 'Save Facility Details'}
        </button>
      </section>

      {/* Provider Accreditations */}
      <section style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
          Provider Accreditations ({setup?.providerAccreditations.length ?? 0})
        </h3>
        {setup?.providerAccreditations.length === 0 && (
          <p style={{ fontSize: 12, color: '#6b7280' }}>No providers added yet.</p>
        )}
        {setup?.providerAccreditations.map((p) => (
          <div key={p.prcLicenseNumber} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 0', borderBottom: '1px solid #e5e7eb',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{p.providerName}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>PRC: {p.prcLicenseNumber}{p.specialty ? ` | ${p.specialty}` : ''}</div>
            </div>
            <button onClick={() => handleRemoveProvider(p.prcLicenseNumber)}
              style={{ padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>
              Remove
            </button>
          </div>
        ))}
        {showProviderForm ? (
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <input placeholder="Provider Name" value={newProviderName} onChange={e => setNewProviderName(e.target.value)}
              style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }} />
            <input placeholder="PRC License" value={newPrcLicense} onChange={e => setNewPrcLicense(e.target.value)}
              style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }} />
            <input placeholder="Specialty (opt)" value={newSpecialty} onChange={e => setNewSpecialty(e.target.value)}
              style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12 }} />
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
              <button onClick={handleAddProvider}
                style={{ padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>
                Add Provider
              </button>
              <button onClick={() => setShowProviderForm(false)}
                style={{ padding: '6px 12px', background: '#e5e7eb', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowProviderForm(true)}
            style={{ marginTop: 8, padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>
            + Add Provider
          </button>
        )}
      </section>

      {/* Readiness Checklist */}
      <section style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
          eClaims 3.0 Readiness Checklist
        </h3>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
          {readinessCount} of {readinessTotal} complete
        </p>
        {setup?.readinessChecklist.map((item) => (
          <label key={item.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0',
            borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
          }}>
            <input type="checkbox" checked={item.completed}
              onChange={(e) => handleToggleReadiness(item.id, e.target.checked)}
              style={{ marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, textDecoration: item.completed ? 'line-through' : undefined }}>
                {item.label}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{item.description}</div>
              {item.completedAt && (
                <div style={{ fontSize: 10, color: '#9ca3af' }}>
                  Completed {new Date(item.completedAt).toLocaleDateString()} by {item.completedBy}
                </div>
              )}
            </div>
          </label>
        ))}
      </section>
    </div>
  );
}
