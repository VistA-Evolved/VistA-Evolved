/**
 * Dashboard layout — wraps all authenticated portal pages.
 * Provides the side navigation and main content area.
 */

import { PortalNav } from "@/components/portal-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <PortalNav />
      <main style={{ flex: 1, padding: "1.5rem", overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}
