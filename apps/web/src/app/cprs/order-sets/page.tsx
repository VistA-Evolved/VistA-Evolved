'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePatient } from '@/stores/patient-context';
import { useDataCache, type DraftOrder } from '@/stores/data-cache';
import { useSession } from '@/stores/session-context';
import CPRSMenuBar from '@/components/cprs/CPRSMenuBar';
import styles from '@/components/cprs/cprs.module.css';

/* ------------------------------------------------------------------ */
/* Order Set Templates (local JSON -- matches CPRS quick-order concept) */
/* ------------------------------------------------------------------ */

interface OrderTemplate {
  id: string;
  name: string;
  category: string;
  type: DraftOrder['type'];
  details: string;
}

const ORDER_SET_TEMPLATES: OrderTemplate[] = [
  // Common Med Orders
  {
    id: 'tpl-med-1',
    name: 'Acetaminophen 500mg PO Q6H PRN',
    category: 'Common Meds',
    type: 'med',
    details: 'Acetaminophen 500mg tab, PO, every 6 hours as needed for pain',
  },
  {
    id: 'tpl-med-2',
    name: 'Lisinopril 10mg PO Daily',
    category: 'Common Meds',
    type: 'med',
    details: 'Lisinopril 10mg tab, PO, once daily',
  },
  {
    id: 'tpl-med-3',
    name: 'Metformin 500mg PO BID',
    category: 'Common Meds',
    type: 'med',
    details: 'Metformin 500mg tab, PO, twice daily with meals',
  },
  {
    id: 'tpl-med-4',
    name: 'Amlodipine 5mg PO Daily',
    category: 'Common Meds',
    type: 'med',
    details: 'Amlodipine 5mg tab, PO, once daily',
  },
  // Lab Orders
  {
    id: 'tpl-lab-1',
    name: 'CBC with Differential',
    category: 'Lab Orders',
    type: 'lab',
    details: 'Complete Blood Count with Differential, routine',
  },
  {
    id: 'tpl-lab-2',
    name: 'BMP (Basic Metabolic Panel)',
    category: 'Lab Orders',
    type: 'lab',
    details: 'Basic Metabolic Panel, routine draw',
  },
  {
    id: 'tpl-lab-3',
    name: 'HbA1c',
    category: 'Lab Orders',
    type: 'lab',
    details: 'Hemoglobin A1c, routine',
  },
  {
    id: 'tpl-lab-4',
    name: 'Lipid Panel',
    category: 'Lab Orders',
    type: 'lab',
    details: 'Lipid Panel (Total Chol, LDL, HDL, Trig), fasting',
  },
  // Imaging Orders
  {
    id: 'tpl-img-1',
    name: 'Chest X-Ray PA/Lateral',
    category: 'Imaging',
    type: 'imaging',
    details: 'Chest X-Ray, PA and Lateral views, routine',
  },
  {
    id: 'tpl-img-2',
    name: 'CT Abdomen/Pelvis w/ Contrast',
    category: 'Imaging',
    type: 'imaging',
    details: 'CT Abdomen and Pelvis with IV contrast',
  },
  // Consult Orders
  {
    id: 'tpl-con-1',
    name: 'Cardiology Consult',
    category: 'Consults',
    type: 'consult',
    details: 'Outpatient cardiology consultation',
  },
  {
    id: 'tpl-con-2',
    name: 'Endocrine Consult',
    category: 'Consults',
    type: 'consult',
    details: 'Outpatient endocrinology consultation',
  },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function OrderSetsPage() {
  const router = useRouter();
  const { dfn } = usePatient();
  const { ready, authenticated } = useSession();
  const { addDraftOrder, getDomain } = useDataCache();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace('/cprs/login?redirect=%2Fcprs%2Forder-sets');
    }
  }, [authenticated, ready, router]);

  const hasPatient = Boolean(dfn);
  const patientDfn = dfn || '';
  const orders = hasPatient ? getDomain(patientDfn, 'orders') : [];

  const categories = ['all', ...new Set(ORDER_SET_TEMPLATES.map((t) => t.category))];

  const filtered =
    selectedCategory === 'all'
      ? ORDER_SET_TEMPLATES
      : ORDER_SET_TEMPLATES.filter((t) => t.category === selectedCategory);

  function handleAddOrder(template: OrderTemplate) {
    if (!hasPatient) return;
    const order: DraftOrder = {
      id: `order-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: template.type,
      name: template.name,
      status: 'draft',
      details: template.details,
      createdAt: new Date().toISOString(),
    };
    addDraftOrder(patientDfn, order);
    setAddedIds((prev) => new Set(prev).add(template.id));
  }

  const draftCount = orders.filter((o) => o.status === 'draft').length;
  const unsignedCount = orders.filter((o) => o.status === 'unsigned').length;

  if (!ready || !authenticated) {
    return (
      <div
        className={styles.shell}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}
      >
        <p style={{ color: 'var(--cprs-text-muted)' }}>Checking session...</p>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <CPRSMenuBar dfn={patientDfn || undefined} />

      <div style={{ padding: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div>
            <h1 style={{ fontSize: 18, margin: 0 }}>Order Sets / Quick Orders</h1>
            <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)', margin: '4px 0 0' }}>
              {hasPatient
                ? `Patient DFN: ${patientDfn} • ${draftCount} draft, ${unsignedCount} unsigned`
                : 'Select a patient to stage local quick-order drafts.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              className={styles.formSelect}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ width: 'auto', fontSize: 12 }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={!hasPatient}
              onClick={() => router.push(`/cprs/chart/${patientDfn}/orders`)}
            >
              View Orders Tab
            </button>
          </div>
        </div>

        {!hasPatient && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              border: '1px solid #c6b36a',
              borderRadius: 6,
              background: '#fff8df',
              color: '#6b5600',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <strong>Patient required.</strong> This page stages quick-order templates into the local CPRS web draft cache.
              Select a patient before adding drafts or opening the Orders tab.
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => router.push('/cprs/patient-search')}>
              Select Patient
            </button>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 12,
          }}
        >
          {filtered.map((tpl) => (
            <div
              key={tpl.id}
              style={{
                border: '1px solid var(--cprs-border)',
                borderRadius: 6,
                padding: 12,
                background: addedIds.has(tpl.id) ? 'var(--cprs-bg)' : 'var(--cprs-surface)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 6,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{tpl.name}</div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--cprs-text-muted)',
                      textTransform: 'uppercase',
                      marginTop: 2,
                    }}
                  >
                    {tpl.category} &bull; {tpl.type}
                  </div>
                </div>
                <button
                  className={`${styles.btn} ${addedIds.has(tpl.id) ? '' : styles.btnPrimary}`}
                  style={{ fontSize: 10, padding: '2px 8px', whiteSpace: 'nowrap' }}
                  onClick={() => handleAddOrder(tpl)}
                  disabled={!hasPatient || addedIds.has(tpl.id)}
                >
                  {!hasPatient ? 'Select Patient' : addedIds.has(tpl.id) ? 'Added' : 'Add to Orders'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: 0 }}>
                {tpl.details}
              </p>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 16,
            padding: 8,
            background: 'var(--cprs-bg)',
            borderRadius: 4,
            fontSize: 11,
            color: 'var(--cprs-text-muted)',
          }}
        >
          <strong>Order Workflow:</strong> Draft {'->'} Unsigned {'->'} Signed {'->'} Released. This page uses
          local quick-order templates to stage <em>Draft</em> entries in the CPRS web cache. Navigate to the Orders tab
          to continue the live signing and release workflow for the selected patient.
        </div>
      </div>
    </div>
  );
}
