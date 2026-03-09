'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/api-config';

interface QuickStats {
  users?: number;
  clinics?: number;
  wards?: number;
  drugs?: number;
}

const NAV_CARDS = [
  { href: '/cprs/admin/vista/dashboard', icon: '\u{1F4CA}', label: 'Dashboard', desc: 'Real-time operational metrics and KPIs' },
  { href: '/cprs/admin/vista/users', icon: '\u{1F9D1}\u200D\u2695\uFE0F', label: 'Users & Security', desc: 'Manage users, security keys, and permissions' },
  { href: '/cprs/admin/vista/facilities', icon: '\u{1F3E5}', label: 'Facilities', desc: 'Institutions, divisions, services, and stop codes' },
  { href: '/cprs/admin/vista/clinics', icon: '\u{1FA7A}', label: 'Clinics', desc: 'Clinic setup, availability, and appointment types' },
  { href: '/cprs/admin/vista/wards', icon: '\u{1F6CF}\uFE0F', label: 'Wards & Beds', desc: 'Ward configuration and bed census' },
  { href: '/cprs/admin/vista/pharmacy', icon: '\u{1F48A}', label: 'Pharmacy', desc: 'Drug formulary, routes, and schedules' },
  { href: '/cprs/admin/vista/lab', icon: '\u{1F9EA}', label: 'Laboratory', desc: 'Lab tests, collection samples, and urgency types' },
  { href: '/cprs/admin/vista/billing', icon: '\u{1F4B0}', label: 'Billing', desc: 'IB parameters, insurance companies, and claims' },
  { href: '/cprs/admin/vista/radiology', icon: '\u{1FA7B}', label: 'Radiology', desc: 'Procedure catalog, imaging locations, and division params' },
  { href: '/cprs/admin/vista/system', icon: '\u2699\uFE0F', label: 'System', desc: 'TaskMan, error traps, parameters, and system health' },
  { href: '/cprs/admin/vista/inventory', icon: '\u{1F4E6}', label: 'Inventory', desc: 'Item master, vendors, and purchase orders' },
  { href: '/cprs/admin/vista/workforce', icon: '\u{1F465}', label: 'Workforce', desc: 'Provider credentials, person classes, and privileges' },
  { href: '/cprs/admin/vista/quality', icon: '\u2705', label: 'Quality', desc: 'Clinical reminders, QA parameters, and compliance' },
  { href: '/cprs/admin/vista/clinical-setup', icon: '\u{1F4CB}', label: 'Clinical Setup', desc: 'Order sets, consult services, TIU, and templates' },
  { href: '/cprs/admin/vista/provisioning', icon: '\u{1F680}', label: 'Provisioning', desc: 'Provision new healthcare organizations' },
];

const STAT_BADGES: { key: keyof QuickStats; label: string; color: string }[] = [
  { key: 'users', label: 'Users', color: '#2563eb' },
  { key: 'clinics', label: 'Clinics', color: '#059669' },
  { key: 'wards', label: 'Wards', color: '#7c3aed' },
  { key: 'drugs', label: 'Drugs', color: '#d97706' },
];

export default function VistaAdminHubPage() {
  const [stats, setStats] = useState<QuickStats>({});
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [cols, setCols] = useState(3);

  useEffect(() => {
    const mq1 = window.matchMedia('(max-width: 640px)');
    const mq2 = window.matchMedia('(max-width: 1024px)');
    const update = () => setCols(mq1.matches ? 1 : mq2.matches ? 2 : 3);
    update();
    mq1.addEventListener('change', update);
    mq2.addEventListener('change', update);
    return () => { mq1.removeEventListener('change', update); mq2.removeEventListener('change', update); };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/vista/dashboard/operational`, { credentials: 'include' });
        if (!res.ok) return;
        const json = await res.json();
        setStats({
          users: json.data?.users?.total ?? json.users?.total,
          clinics: json.data?.clinics?.total ?? json.clinics?.total,
          wards: json.data?.wards?.total ?? json.wards?.total,
          drugs: json.data?.pharmacy?.drugs ?? json.pharmacy?.drugs,
        });
      } catch { /* stats are optional */ }
    })();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)',
        color: '#fff',
        padding: '32px 32px 24px',
      }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
          VistA Administration
        </h1>
        <p style={{ fontSize: 15, color: '#94a3b8', margin: '6px 0 0', fontWeight: 400 }}>
          Manage your healthcare organization&apos;s VistA system
        </p>
      </div>

      {/* Quick Stats Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        padding: '16px 32px',
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}>
        {STAT_BADGES.map(({ key, label, color }) => (
          <div key={key} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 20,
            background: `${color}10`,
            border: `1px solid ${color}30`,
            fontSize: 13,
            fontWeight: 600,
          }}>
            <span style={{ color, fontSize: 18, fontWeight: 800 }}>
              {stats[key] != null ? stats[key]!.toLocaleString() : '--'}
            </span>
            <span style={{ color: '#475569' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Navigation Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 20,
        padding: '28px 32px 48px',
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        {NAV_CARDS.map((card) => {
          const isHovered = hoveredCard === card.href;
          return (
            <Link
              key={card.href}
              href={card.href}
              onMouseEnter={() => setHoveredCard(card.href)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                background: '#fff',
                borderRadius: 12,
                padding: '24px 22px',
                border: '1px solid #e2e8f0',
                boxShadow: isHovered
                  ? '0 8px 24px rgba(0,0,0,0.10)'
                  : '0 1px 3px rgba(0,0,0,0.05)',
                transform: isHovered ? 'translateY(-2px)' : 'none',
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{card.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                {card.label}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                {card.desc}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
