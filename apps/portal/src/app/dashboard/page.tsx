/**
 * Dashboard Home -- Summary cards for each clinical domain.
 * Each card shows a data-source badge and links to its detail page.
 */

import { DataSourceBadge } from '@/components/data-source-badge';
import Link from 'next/link';

const SUMMARY_CARDS = [
  {
    title: 'Allergies',
    href: '/dashboard/health',
    icon: '⚠️',
    source: 'ehr' as const,
    description: 'View your known allergies and reactions',
  },
  {
    title: 'Medications',
    href: '/dashboard/medications',
    icon: '💊',
    source: 'ehr' as const,
    description: 'View your active medications',
  },
  {
    title: 'Vitals',
    href: '/dashboard/health',
    icon: '❤️',
    source: 'ehr' as const,
    description: 'View your recent vital signs',
  },
  {
    title: 'Lab Results',
    href: '/dashboard/health',
    icon: '🔬',
    source: 'ehr' as const,
    description: 'View your laboratory results',
  },
  {
    title: 'Messages',
    href: '/dashboard/messages',
    icon: '✉️',
    source: 'local' as const,
    label: 'Mixed Sources',
    description: 'Send and receive secure messages',
  },
  {
    title: 'Appointments',
    href: '/dashboard/appointments',
    icon: '📅',
    source: 'pending' as const,
    label: 'Check Page Source',
    description: 'View and manage your appointments',
  },
  {
    title: 'Record Sharing',
    href: '/dashboard/profile',
    icon: '🔗',
    source: 'local' as const,
    label: 'Portal Managed',
    description: 'Share records with providers or caregivers',
  },
];

export default function DashboardPage() {
  return (
    <div className="container">
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Welcome Back</h1>
      <p
        style={{
          color: 'var(--portal-text-muted)',
          fontSize: '0.875rem',
          marginBottom: '1.5rem',
        }}
      >
        Your health information at a glance
      </p>

      <div className="grid-3">
        {SUMMARY_CARDS.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="card" style={{ cursor: 'pointer' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '0.5rem',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{card.icon}</span>
                <DataSourceBadge source={card.source} label={card.label} />
              </div>
              <h3 style={{ textTransform: 'none', color: 'var(--portal-text)' }}>{card.title}</h3>
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--portal-text-muted)',
                  margin: 0,
                }}
              >
                {card.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
