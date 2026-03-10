'use client';

import { useState, useCallback, type FormEvent } from 'react';
import { API_BASE } from '@/lib/api-config';
import { csrfHeaders, getCsrfToken } from '@/lib/csrf';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface RegistrationForm {
  lastName: string;
  firstName: string;
  dob: string;
  sex: 'M' | 'F' | '';
  ssn: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  veteranStatus: boolean;
}

interface DuplicateMatch {
  dfn: string;
  name: string;
  dob: string;
  ssn4?: string;
}

interface FieldError {
  field: string;
  message: string;
}

type Phase = 'form' | 'duplicates' | 'submitting' | 'success' | 'error';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV',
  'NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN',
  'TX','UT','VT','VA','WA','WV','WI','WY','DC','PR','VI','GU','AS','MP',
];

const INITIAL_FORM: RegistrationForm = {
  lastName: '',
  firstName: '',
  dob: '',
  sex: '',
  ssn: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
  veteranStatus: false,
};

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

function validate(form: RegistrationForm): FieldError[] {
  const errors: FieldError[] = [];
  if (!form.lastName.trim()) errors.push({ field: 'lastName', message: 'Last name is required' });
  if (!form.firstName.trim()) errors.push({ field: 'firstName', message: 'First name is required' });
  if (!form.dob) {
    errors.push({ field: 'dob', message: 'Date of birth is required' });
  } else {
    const d = new Date(form.dob);
    if (isNaN(d.getTime()) || d > new Date()) {
      errors.push({ field: 'dob', message: 'Enter a valid date of birth in the past' });
    }
  }
  if (!form.sex) errors.push({ field: 'sex', message: 'Sex is required' });
  if (form.ssn && !/^\d{3}-?\d{2}-?\d{4}$/.test(form.ssn)) {
    errors.push({ field: 'ssn', message: 'SSN must be 9 digits (###-##-#### or #########)' });
  }
  if (!form.street.trim()) errors.push({ field: 'street', message: 'Street address is required' });
  if (!form.city.trim()) errors.push({ field: 'city', message: 'City is required' });
  if (!form.state) errors.push({ field: 'state', message: 'State is required' });
  if (!form.zip || !/^\d{5}(-\d{4})?$/.test(form.zip)) {
    errors.push({ field: 'zip', message: 'Enter a valid ZIP code' });
  }
  if (form.phone && !/^[\d\s()+-]{7,20}$/.test(form.phone)) {
    errors.push({ field: 'phone', message: 'Enter a valid phone number' });
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: '1.5rem',
  marginBottom: '1rem',
};

const sectionTitle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 600,
  color: '#1e293b',
  marginBottom: '1rem',
  paddingBottom: '0.5rem',
  borderBottom: '1px solid #e2e8f0',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const fieldRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.75rem',
  marginBottom: '0.75rem',
};

const fieldRowThree: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1fr',
  gap: '0.75rem',
  marginBottom: '0.75rem',
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: '#334155',
  marginBottom: '0.25rem',
};

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  outline: 'none',
  background: '#fff',
  color: '#1e293b',
  boxSizing: 'border-box',
};

const inputError: React.CSSProperties = {
  ...inputBase,
  borderColor: '#ef4444',
};

const btnPrimary: React.CSSProperties = {
  padding: '0.625rem 1.5rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '0.625rem 1.5rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  background: '#f1f5f9',
  color: '#334155',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  cursor: 'pointer',
};

const errorText: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#ef4444',
  marginTop: '0.25rem',
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function RegistrationPage() {
  const [form, setForm] = useState<RegistrationForm>({ ...INITIAL_FORM });
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);
  const [phase, setPhase] = useState<Phase>('form');
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [newDfn, setNewDfn] = useState('');
  const [serverError, setServerError] = useState('');

  const fieldErr = (name: string) => fieldErrors.find((e) => e.field === name)?.message;

  const setField = useCallback(
    <K extends keyof RegistrationForm>(key: K, value: RegistrationForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setFieldErrors((prev) => prev.filter((e) => e.field !== key));
    },
    [],
  );

  /* ---------- Duplicate check ----------------------------------- */

  const checkDuplicates = useCallback(async (): Promise<DuplicateMatch[]> => {
    try {
      const params = new URLSearchParams({
        name: `${form.lastName},${form.firstName}`,
        dob: form.dob,
      });
      const res = await fetch(`${API_BASE}/vista/patient/duplicate-check?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.matches ?? json.data ?? []) as DuplicateMatch[];
    } catch {
      return [];
    }
  }, [form.lastName, form.firstName, form.dob]);

  /* ---------- Submit registration -------------------------------- */

  const submitRegistration = useCallback(async () => {
    setPhase('submitting');
    setServerError('');
    try {
      await getCsrfToken();
      const res = await fetch(`${API_BASE}/vista/patient/register`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          lastName: form.lastName.trim(),
          firstName: form.firstName.trim(),
          dob: form.dob,
          sex: form.sex,
          ssn: form.ssn.replace(/-/g, '') || undefined,
          address: {
            street: form.street.trim(),
            city: form.city.trim(),
            state: form.state,
            zip: form.zip.trim(),
          },
          phone: form.phone.trim() || undefined,
          veteranStatus: form.veteranStatus,
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setNewDfn(json.dfn || json.data?.dfn || '');
        setPhase('success');
      } else {
        setServerError(json.error || json.message || `Registration failed (HTTP ${res.status})`);
        setPhase('error');
      }
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Network error');
      setPhase('error');
    }
  }, [form]);

  /* ---------- Form submit handler -------------------------------- */

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const errs = validate(form);
      if (errs.length > 0) {
        setFieldErrors(errs);
        return;
      }
      setFieldErrors([]);

      const dups = await checkDuplicates();
      if (dups.length > 0) {
        setDuplicates(dups);
        setPhase('duplicates');
        return;
      }
      await submitRegistration();
    },
    [form, checkDuplicates, submitRegistration],
  );

  const resetForm = useCallback(() => {
    setForm({ ...INITIAL_FORM });
    setFieldErrors([]);
    setPhase('form');
    setDuplicates([]);
    setNewDfn('');
    setServerError('');
  }, []);

  /* ---------- Success state -------------------------------------- */

  if (phase === 'success') {
    return (
      <div className="container">
        <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#10003;</div>
          <h2 style={{ fontSize: '1.25rem', color: '#059669', marginBottom: '0.5rem' }}>
            Patient Registered Successfully
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
            {form.lastName}, {form.firstName} has been registered.
          </p>
          <div
            style={{
              display: 'inline-block',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: 6,
              padding: '0.75rem 2rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#065f46', marginBottom: '0.25rem' }}>
              Assigned DFN
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>{newDfn}</div>
          </div>
          <div>
            <button style={btnPrimary} onClick={resetForm}>
              Register Another Patient
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Error state ---------------------------------------- */

  if (phase === 'error') {
    return (
      <div className="container">
        <div style={{ ...card, textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#ef4444' }}>&#10007;</div>
          <h2 style={{ fontSize: '1.25rem', color: '#dc2626', marginBottom: '0.5rem' }}>
            Registration Failed
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
            {serverError}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button style={btnSecondary} onClick={() => setPhase('form')}>
              Back to Form
            </button>
            <button style={btnPrimary} onClick={submitRegistration}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Duplicate warning ---------------------------------- */

  if (phase === 'duplicates') {
    return (
      <div className="container">
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Patient Registration</h1>
        <p style={{ color: 'var(--portal-text-muted, #64748b)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Potential duplicate records detected
        </p>
        <div
          style={{
            ...card,
            borderColor: '#fbbf24',
            background: '#fffbeb',
          }}
        >
          <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '0.75rem', fontSize: '0.9375rem' }}>
            The following existing records match the patient you are registering:
          </div>
          <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse', marginBottom: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #fde68a', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>DFN</th>
                <th style={{ padding: '0.5rem' }}>Name</th>
                <th style={{ padding: '0.5rem' }}>DOB</th>
                <th style={{ padding: '0.5rem' }}>SSN (last 4)</th>
              </tr>
            </thead>
            <tbody>
              {duplicates.map((dup) => (
                <tr key={dup.dfn} style={{ borderBottom: '1px solid #fef3c7' }}>
                  <td style={{ padding: '0.5rem', fontWeight: 600 }}>{dup.dfn}</td>
                  <td style={{ padding: '0.5rem' }}>{dup.name}</td>
                  <td style={{ padding: '0.5rem' }}>{dup.dob}</td>
                  <td style={{ padding: '0.5rem' }}>{dup.ssn4 || '----'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button style={btnSecondary} onClick={() => setPhase('form')}>
              Go Back &amp; Edit
            </button>
            <button
              style={{ ...btnPrimary, background: '#d97706' }}
              onClick={submitRegistration}
            >
              Register Anyway
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Main form ------------------------------------------ */

  return (
    <div className="container">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Patient Registration</h1>
        <p style={{ color: 'var(--portal-text-muted, #64748b)', fontSize: '0.875rem' }}>
          Register a new patient in the health record system
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* --- Identity --- */}
        <div style={card}>
          <div style={sectionTitle}>Patient Identity</div>
          <div style={fieldRow}>
            <div>
              <label style={label}>
                Last Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                style={fieldErr('lastName') ? inputError : inputBase}
                value={form.lastName}
                onChange={(e) => setField('lastName', e.target.value)}
                placeholder="SMITH"
                autoComplete="family-name"
              />
              {fieldErr('lastName') && <div style={errorText}>{fieldErr('lastName')}</div>}
            </div>
            <div>
              <label style={label}>
                First Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                style={fieldErr('firstName') ? inputError : inputBase}
                value={form.firstName}
                onChange={(e) => setField('firstName', e.target.value)}
                placeholder="JOHN"
                autoComplete="given-name"
              />
              {fieldErr('firstName') && <div style={errorText}>{fieldErr('firstName')}</div>}
            </div>
          </div>
          <div style={fieldRowThree}>
            <div>
              <label style={label}>
                Date of Birth <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                style={fieldErr('dob') ? inputError : inputBase}
                value={form.dob}
                onChange={(e) => setField('dob', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
              {fieldErr('dob') && <div style={errorText}>{fieldErr('dob')}</div>}
            </div>
            <div>
              <label style={label}>
                Sex <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                style={fieldErr('sex') ? inputError : inputBase}
                value={form.sex}
                onChange={(e) => setField('sex', e.target.value as 'M' | 'F')}
              >
                <option value="">Select...</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
              {fieldErr('sex') && <div style={errorText}>{fieldErr('sex')}</div>}
            </div>
            <div>
              <label style={label}>SSN (optional)</label>
              <input
                style={fieldErr('ssn') ? inputError : inputBase}
                value={form.ssn}
                onChange={(e) => setField('ssn', e.target.value)}
                placeholder="###-##-####"
                autoComplete="off"
                maxLength={11}
              />
              {fieldErr('ssn') && <div style={errorText}>{fieldErr('ssn')}</div>}
            </div>
          </div>
        </div>

        {/* --- Contact --- */}
        <div style={card}>
          <div style={sectionTitle}>Contact Information</div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={label}>
              Street Address <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              style={fieldErr('street') ? inputError : inputBase}
              value={form.street}
              onChange={(e) => setField('street', e.target.value)}
              placeholder="123 Main Street"
              autoComplete="street-address"
            />
            {fieldErr('street') && <div style={errorText}>{fieldErr('street')}</div>}
          </div>
          <div style={fieldRowThree}>
            <div>
              <label style={label}>
                City <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                style={fieldErr('city') ? inputError : inputBase}
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
                placeholder="Anytown"
                autoComplete="address-level2"
              />
              {fieldErr('city') && <div style={errorText}>{fieldErr('city')}</div>}
            </div>
            <div>
              <label style={label}>
                State <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                style={fieldErr('state') ? inputError : inputBase}
                value={form.state}
                onChange={(e) => setField('state', e.target.value)}
              >
                <option value="">Select...</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {fieldErr('state') && <div style={errorText}>{fieldErr('state')}</div>}
            </div>
            <div>
              <label style={label}>
                ZIP Code <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                style={fieldErr('zip') ? inputError : inputBase}
                value={form.zip}
                onChange={(e) => setField('zip', e.target.value)}
                placeholder="12345"
                autoComplete="postal-code"
                maxLength={10}
              />
              {fieldErr('zip') && <div style={errorText}>{fieldErr('zip')}</div>}
            </div>
          </div>
          <div style={fieldRow}>
            <div>
              <label style={label}>Phone Number</label>
              <input
                style={fieldErr('phone') ? inputError : inputBase}
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="(555) 123-4567"
                autoComplete="tel"
              />
              {fieldErr('phone') && <div style={errorText}>{fieldErr('phone')}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.veteranStatus}
                  onChange={(e) => setField('veteranStatus', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#2563eb' }}
                />
                Veteran
              </label>
            </div>
          </div>
        </div>

        {/* --- Actions --- */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" style={btnSecondary} onClick={resetForm}>
            Clear Form
          </button>
          <button
            type="submit"
            style={{
              ...btnPrimary,
              opacity: phase === 'submitting' ? 0.7 : 1,
              cursor: phase === 'submitting' ? 'not-allowed' : 'pointer',
            }}
            disabled={phase === 'submitting'}
          >
            {phase === 'submitting' ? 'Registering...' : 'Register Patient'}
          </button>
        </div>

        {fieldErrors.length > 0 && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 6,
              fontSize: '0.8125rem',
              color: '#991b1b',
            }}
          >
            Please correct {fieldErrors.length} error{fieldErrors.length > 1 ? 's' : ''} above.
          </div>
        )}
      </form>
    </div>
  );
}
