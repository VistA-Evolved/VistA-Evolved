'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api-config';

async function portalFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  return res.json();
}

/* ================================================================== */
/* Adaptive Intake Form -- SDC-like $next-question questionnaire         */
/* ================================================================== */

interface QRItem {
  linkId: string;
  text?: string;
  answer: any[];
}

interface NextItem {
  linkId: string;
  type: string;
  text: string;
  required?: boolean;
  section?: string;
  answerOption?: { value: string; display: string }[];
  redFlag?: { message: string; severity: string };
}

interface Progress {
  percentComplete: number;
  sectionsComplete: string[];
  coverageRemaining: string[];
}

export default function IntakeSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;

  const [session, setSession] = useState<any>(null);
  const [qrItems, setQRItems] = useState<QRItem[]>([]);
  const [nextItems, setNextItems] = useState<NextItem[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [completed, setCompleted] = useState(false);
  const [currentSection, setCurrentSection] = useState('');

  const loadSession = useCallback(async () => {
    const res = await portalFetch(`/intake/sessions/${sessionId}`);
    if (res.ok) {
      setSession(res.session);
      if (res.questionnaireResponse) {
        setQRItems(res.questionnaireResponse.item || []);
      }
      if (res.progress) {
        setProgress(res.progress);
      }
      if (res.session.status === 'submitted') {
        setCompleted(true);
      }
    }
    return res;
  }, [sessionId]);

  const fetchNextQuestions = useCallback(async () => {
    const res = await portalFetch(`/intake/sessions/${sessionId}/next-question`, {
      method: 'POST',
      body: JSON.stringify({
        questionnaireResponseSoFar: {
          resourceType: 'QuestionnaireResponse',
          status: 'in-progress',
          item: qrItems,
        },
      }),
    });
    if (res.ok) {
      setNextItems(res.nextItems || []);
      if (res.progress) setProgress(res.progress);
      if (res.isComplete) {
        // All questions answered
        setNextItems([]);
      }
      if (res.nextItems?.[0]?.section) {
        setCurrentSection(res.nextItems[0].section);
      }
    }
    return res;
  }, [sessionId, qrItems]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadSession();
      setLoading(false);
    })();
  }, [loadSession]);

  useEffect(() => {
    if (session && !completed) {
      fetchNextQuestions();
    }
  }, [session, completed, qrItems.length]);

  // Handle answer change
  function handleAnswer(linkId: string, value: any) {
    setAnswers((prev) => ({ ...prev, [linkId]: value }));
  }

  // Submit current batch of answers and get next questions
  async function submitAnswers() {
    const batch = nextItems
      .map((item) => ({
        linkId: item.linkId,
        text: item.text,
        answer: answers[item.linkId] !== undefined ? [{ value: answers[item.linkId] }] : [],
      }))
      .filter((a) => a.answer.length > 0);

    if (batch.length === 0) {
      setNotice({ type: 'error', text: 'Please answer at least one question' });
      return;
    }

    setSubmitting(true);
    setNotice(null);

    const res = await portalFetch(`/intake/sessions/${sessionId}/answers`, {
      method: 'POST',
      body: JSON.stringify({ answers: batch }),
    });

    if (res.ok) {
      setQRItems(res.questionnaireResponse?.item || qrItems);
      setAnswers({});
      if (res.nextItems && res.nextItems.length > 0) {
        setNextItems(res.nextItems);
        if (res.nextItems[0]?.section) setCurrentSection(res.nextItems[0].section);
      } else {
        // Re-fetch to check if complete
        await fetchNextQuestions();
      }
    } else {
      setNotice({ type: 'error', text: res.error || 'Failed to save answers' });
    }

    setSubmitting(false);
  }

  // Submit final intake
  async function submitIntake() {
    setSubmitting(true);
    setNotice(null);
    const res = await portalFetch(`/intake/sessions/${sessionId}/submit`, {
      method: 'POST',
    });
    if (res.ok) {
      setCompleted(true);
      setSummary(res.summary);
      setNotice({
        type: 'success',
        text: 'Your intake has been submitted. Your care team will review it.',
      });
    } else {
      setNotice({ type: 'error', text: res.error || 'Failed to submit' });
    }
    setSubmitting(false);
  }

  // Save draft
  async function saveDraft() {
    setNotice(null);
    const res = await portalFetch(`/intake/sessions/${sessionId}/save`, { method: 'POST' });
    if (res.ok) {
      setNotice({ type: 'success', text: 'Draft saved' });
    } else {
      setNotice({ type: 'error', text: res.error || 'Failed to save draft' });
    }
  }

  /* ---- Styles ---- */
  const cardStyle: React.CSSProperties = {
    background: 'var(--portal-bg-card, #fff)',
    border: '1px solid var(--portal-border, #e5e7eb)',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px',
  };

  const btnPrimary: React.CSSProperties = {
    background: 'var(--portal-primary, #2563eb)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 24px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 600,
  };

  const btnSecondary: React.CSSProperties = {
    background: 'transparent',
    color: 'var(--portal-primary, #2563eb)',
    border: '1px solid var(--portal-primary, #2563eb)',
    borderRadius: '6px',
    padding: '8px 20px',
    cursor: 'pointer',
    fontSize: '14px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid var(--portal-border, #e5e7eb)',
    fontSize: '15px',
    marginTop: '6px',
  };

  const redFlagStyle: React.CSSProperties = {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    padding: '8px 12px',
    marginTop: '6px',
    fontSize: '13px',
    color: '#991b1b',
  };

  const sectionMap: Record<string, string> = {
    demographics: 'Demographics',
    consent: 'Consent',
    chief_complaint: 'Chief Complaint',
    hpi: 'History of Present Illness',
    ros: 'Review of Systems',
    pmh: 'Past Medical History',
    family_hx: 'Family History',
    social_hx: 'Social History',
    medications: 'Medications',
    allergies: 'Allergies',
    screening: 'Screening',
    triage: 'Triage',
    safety: 'Safety',
    preventive: 'Preventive Care',
    custom: 'Additional Questions',
  };

  if (loading) {
    return <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>Loading...</div>;
  }

  if (!session) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
        <p style={{ color: '#991b1b' }}>Session not found.</p>
        <button style={btnSecondary} onClick={() => router.push('/dashboard/intake')}>
          Back to Intake
        </button>
      </div>
    );
  }

  if (completed) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ ...cardStyle, borderColor: '#10b981' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#166534', marginBottom: '8px' }}>
            Intake Submitted
          </h1>
          <p style={{ color: 'var(--portal-text-muted, #6b7280)', marginBottom: '16px' }}>
            Thank you for completing your pre-visit questionnaire. Your care team will review your
            responses before your appointment.
          </p>
          {summary?.sections?.redFlags?.length > 0 && (
            <div style={redFlagStyle}>
              <strong>Note:</strong> Your responses indicate items that your care team will
              prioritize during your visit.
            </div>
          )}
          <div style={{ marginTop: '16px' }}>
            <button style={btnSecondary} onClick={() => router.push('/dashboard/intake')}>
              Back to Intake
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Health Questionnaire</h1>
        <button style={btnSecondary} onClick={saveDraft}>
          Save Draft
        </button>
      </div>

      {/* Progress bar */}
      {progress && (
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: 'var(--portal-text-muted, #6b7280)',
              marginBottom: '4px',
            }}
          >
            <span>{sectionMap[currentSection] || currentSection}</span>
            <span>{progress.percentComplete}% complete</span>
          </div>
          <div
            style={{
              background: '#e5e7eb',
              borderRadius: '4px',
              height: '8px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                background: 'var(--portal-primary, #2563eb)',
                height: '100%',
                width: `${progress.percentComplete}%`,
                transition: 'width 0.3s ease',
                borderRadius: '4px',
              }}
            />
          </div>
        </div>
      )}

      {/* Notice */}
      {notice && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '16px',
            background: notice.type === 'error' ? '#fef2f2' : '#f0fdf4',
            color: notice.type === 'error' ? '#991b1b' : '#166534',
            border: `1px solid ${notice.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          }}
        >
          {notice.text}
        </div>
      )}

      {/* Questions */}
      {nextItems.length > 0 ? (
        <div>
          {nextItems.map((item) => (
            <div key={item.linkId} style={cardStyle}>
              <label
                style={{ display: 'block', fontSize: '15px', fontWeight: 500, marginBottom: '4px' }}
              >
                {item.text}
                {item.required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
              </label>

              {/* Render by type */}
              {item.type === 'boolean' && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  {['Yes', 'No'].map((label) => {
                    const val = label === 'Yes';
                    const selected = answers[item.linkId] === val;
                    return (
                      <button
                        key={label}
                        onClick={() => handleAnswer(item.linkId, val)}
                        style={{
                          padding: '10px 24px',
                          borderRadius: '6px',
                          border: selected
                            ? '2px solid var(--portal-primary, #2563eb)'
                            : '1px solid var(--portal-border, #e5e7eb)',
                          background: selected ? '#eff6ff' : 'transparent',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontWeight: selected ? 600 : 400,
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {item.type === 'string' && (
                <input
                  type="text"
                  style={inputStyle}
                  value={answers[item.linkId] || ''}
                  onChange={(e) => handleAnswer(item.linkId, e.target.value)}
                  placeholder="Type your answer..."
                />
              )}

              {item.type === 'integer' && (
                <input
                  type="number"
                  style={inputStyle}
                  value={answers[item.linkId] ?? ''}
                  onChange={(e) => handleAnswer(item.linkId, parseInt(e.target.value) || 0)}
                  min={0}
                  max={10}
                />
              )}

              {(item.type === 'choice' || item.type === 'open-choice') && item.answerOption && (
                <div
                  style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}
                >
                  {item.answerOption.map((opt) => {
                    const selected = answers[item.linkId] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleAnswer(item.linkId, opt.value)}
                        style={{
                          padding: '10px 16px',
                          textAlign: 'left',
                          borderRadius: '6px',
                          border: selected
                            ? '2px solid var(--portal-primary, #2563eb)'
                            : '1px solid var(--portal-border, #e5e7eb)',
                          background: selected ? '#eff6ff' : 'transparent',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontWeight: selected ? 600 : 400,
                        }}
                      >
                        {opt.display}
                      </button>
                    );
                  })}
                </div>
              )}

              {item.type === 'display' && (
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--portal-text-muted, #6b7280)',
                    fontStyle: 'italic',
                  }}
                >
                  {/* Display items are informational -- no input needed */}
                </p>
              )}

              {/* Red flag warning (visible only after answer triggers it) */}
              {item.redFlag && answers[item.linkId] === true && (
                <div style={redFlagStyle}>
                  {item.redFlag.severity === 'critical'
                    ? 'Please inform staff immediately if you are experiencing this symptom.'
                    : 'Your care team will be alerted about this response.'}
                </div>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button style={btnPrimary} onClick={submitAnswers} disabled={submitting}>
              {submitting ? 'Saving...' : 'Next'}
            </button>
            <button style={btnSecondary} onClick={saveDraft}>
              Save for Later
            </button>
          </div>
        </div>
      ) : (
        /* All questions answered -- ready to submit */
        !completed && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              All questions answered!
            </h2>
            <p style={{ color: 'var(--portal-text-muted, #6b7280)', marginBottom: '16px' }}>
              You have completed all sections. Review your answers or submit your intake.
            </p>

            {/* Quick summary of answered items */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: 500 }}>
                {qrItems.length} questions answered across {progress?.sectionsComplete?.length || 0}{' '}
                sections
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={btnPrimary} onClick={submitIntake} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Intake'}
              </button>
              <button style={btnSecondary} onClick={() => router.push('/dashboard/intake')}>
                Save and Exit
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
