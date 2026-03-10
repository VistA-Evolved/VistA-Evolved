'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePatient } from '@/stores/patient-context';
import { useDataCache, type DraftOrder } from '@/stores/data-cache';
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
  const { addDraftOrder, getDomain } = useDataCache();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const patientDfn = dfn || '1';
  const orders = getDomain(patientDfn, 'orders');

  const categories = ['all', ...new Set(ORDER_SET_TEMPLATES.map((t) => t.category))];

  const filtered =
    selectedCategory === 'all'
      ? ORDER_SET_TEMPLATES
      : ORDER_SET_TEMPLATES.filter((t) => t.category === selectedCategory);

  function handleAddOrder(template: OrderTemplate) {
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

  return (
    <div className={styles.shell}>
      <CPRSMenuBar dfn={patientDfn} />

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
              Patient DFN: {patientDfn} &bull; {draftCount} draft, {unsignedCount} unsigned
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
              onClick={() => router.push(`/cprs/chart/${patientDfn}/orders`)}
            >
              View Orders Tab
            </button>
          </div>
        </div>

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
                  disabled={addedIds.has(tpl.id)}
                >
                  {addedIds.has(tpl.id) ? 'Added' : 'Add to Orders'}
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
          <strong>Order Workflow:</strong> Draft {'->'} Unsigned {'->'} Signed {'->'} Released. Orders added here
          start as <em>Draft</em>. Navigate to the Orders tab to sign and release. Contract: ORWDX
          SAVE, ORWDXA DC.
        </div>
      </div>
    </div>
  );
}
