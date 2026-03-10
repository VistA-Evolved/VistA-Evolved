import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vistaevolved.com';

export const metadata: Metadata = {
  title: {
    default: 'VistA Evolved - Modern Healthcare EHR Platform',
    template: '%s | VistA Evolved',
  },
  description: 'Enterprise-grade EHR built on proven VistA clinical logic. Modern web UI, multi-tenant SaaS, FHIR R4 interoperability.',
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: 'website',
    siteName: 'VistA Evolved',
    title: 'VistA Evolved - Modern Healthcare EHR Platform',
    description: 'Enterprise-grade EHR built on proven VistA clinical logic. Modern web UI, multi-tenant SaaS, FHIR R4 interoperability.',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VistA Evolved - Modern Healthcare EHR Platform',
    description: 'Enterprise-grade EHR built on proven VistA clinical logic. Modern web UI, multi-tenant SaaS, FHIR R4 interop.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
