import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VistA Evolved - Modern Healthcare EHR Platform',
  description: 'Enterprise-grade EHR built on proven VistA clinical logic. Modern web UI, multi-tenant SaaS, FHIR R4 interoperability.',
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
