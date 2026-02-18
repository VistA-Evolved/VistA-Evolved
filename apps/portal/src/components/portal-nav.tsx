/**
 * PortalNav — Main navigation for the patient portal.
 *
 * Rules:
 * - No VA-specific terminology (no "CPRS", "VistA", "DUZ", "DFN")
 * - No dead clicks — every link goes to a real route
 * - Plain-language labels only
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/dashboard/health", label: "Health Records", icon: "📋" },
  { href: "/dashboard/medications", label: "Medications", icon: "💊" },
  { href: "/dashboard/messages", label: "Messages", icon: "✉️" },
  { href: "/dashboard/appointments", label: "Appointments", icon: "📅" },
  { href: "/dashboard/telehealth", label: "Telehealth", icon: "📹" },
  { href: "/dashboard/profile", label: "My Profile", icon: "👤" },
] as const;

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        <span style={styles.brandIcon}>🏥</span>
        <span style={styles.brandText}>Health Portal</span>
      </div>
      <ul style={styles.list}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              pathname.startsWith(item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                style={{
                  ...styles.link,
                  ...(isActive ? styles.linkActive : {}),
                }}
              >
                <span style={styles.icon}>{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div style={styles.footer}>
        <form action="/api/logout" method="POST">
          <button type="submit" style={styles.logoutBtn}>
            Sign Out
          </button>
        </form>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    width: 240,
    minHeight: "100vh",
    background: "#1e293b",
    color: "#e2e8f0",
    display: "flex",
    flexDirection: "column",
    padding: "1rem 0",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0 1rem 1.25rem",
    borderBottom: "1px solid #334155",
    marginBottom: "0.75rem",
  },
  brandIcon: { fontSize: "1.25rem" },
  brandText: { fontWeight: 700, fontSize: "1rem" },
  list: {
    listStyle: "none",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  link: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 1rem",
    color: "#94a3b8",
    textDecoration: "none",
    fontSize: "0.875rem",
    borderRadius: "0 4px 4px 0",
    transition: "background 0.15s, color 0.15s",
  },
  linkActive: {
    background: "#334155",
    color: "#f1f5f9",
    fontWeight: 600,
  },
  icon: { fontSize: "1rem", width: "1.25rem", textAlign: "center" as const },
  footer: {
    padding: "0.75rem 1rem 0",
    borderTop: "1px solid #334155",
    marginTop: "auto",
  },
  logoutBtn: {
    background: "transparent",
    border: "1px solid #475569",
    color: "#94a3b8",
    padding: "0.375rem 0.75rem",
    borderRadius: 6,
    fontSize: "0.8125rem",
    cursor: "pointer",
    width: "100%",
  },
};
