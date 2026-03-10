import { useState } from "react";

const phases = [
  { id: 0, name: "Foundation", weeks: "1-4", color: "#dc2626", items: ["Platform DB + Auth", "VistA Gateway + RPC Client", "Docker Provisioning", "React Shell", "First RPC Call"] },
  { id: 1, name: "Users & Security", weeks: "5-8", color: "#ea580c", items: ["User CRUD", "Security Keys", "Menu Assignment", "Provider Setup", "Role Templates"] },
  { id: 2, name: "Facility & Clinics", weeks: "9-12", color: "#d97706", items: ["Institution/Division", "Departments", "Clinic Wizard", "Availability Patterns", "Clinic Groups"] },
  { id: 3, name: "Inpatient/ADT", weeks: "13-15", color: "#ca8a04", items: ["Ward Config", "Bed Management", "Bed Board UI", "Census Dashboard"] },
  { id: 4, name: "Billing & Revenue", weeks: "16-20", color: "#65a30d", items: ["Billing Params", "Insurance Mgmt", "Fee Schedules", "Revenue Dashboard", "PhilHealth/HMO"] },
  { id: 5, name: "Pharmacy", weeks: "21-24", color: "#16a34a", items: ["Drug Formulary", "Interaction Settings", "OP/IP Pharmacy Setup", "Controlled Substances"] },
  { id: 6, name: "Lab & Radiology", weeks: "25-28", color: "#0d9488", items: ["Test Catalog", "Accession Areas", "Reference Ranges", "Rad Procedures"] },
  { id: 7, name: "Clinical Setup", weeks: "29-32", color: "#0284c7", items: ["Order Sets", "Consult Services", "TIU Templates", "Clinical Reminders"] },
  { id: 8, name: "Reports & BI", weeks: "33-36", color: "#4f46e5", items: ["Ops Dashboard", "Financial Dashboard", "Report Library", "Export Engine"] },
  { id: 9, name: "Remaining", weeks: "37-44", color: "#7c3aed", items: ["Inventory", "Workforce", "Quality Mgmt", "System Admin Tools"] },
  { id: 10, name: "SaaS Launch", weeks: "45-48", color: "#a21caf", items: ["Self-Service Signup", "Payment Integration", "Onboarding Wizard", "Marketing Site"] },
];

const entityTypes = [
  {
    name: "Solo Clinic",
    icon: "🏥",
    users: "1-20",
    price: "$99-299/mo",
    modules: ["Scheduling", "OP Pharmacy", "Basic Billing", "Clinical Notes", "Orders", "Vitals", "Reports"],
    disabled: ["ADT/Wards", "IP Pharmacy", "Surgery", "Inventory", "Engineering", "Dietetics"],
  },
  {
    name: "Multi-Clinic",
    icon: "🏥🏥",
    users: "20-100",
    price: "$499-999/mo",
    modules: ["Everything in Solo +", "Multi-Division", "Centralized MPI", "Inter-Clinic Referrals", "Shared Formulary", "Consolidated Reports", "Consults"],
    disabled: ["ADT/Wards", "IP Pharmacy", "Surgery", "Engineering"],
  },
  {
    name: "Hospital",
    icon: "🏨",
    users: "100-500",
    price: "$2-5K/mo",
    modules: ["Everything in Multi +", "Full ADT", "Ward/Bed Mgmt", "IP Pharmacy", "Surgery", "Full Lab", "Full Radiology", "Inventory", "Dietetics", "Engineering", "Quality Mgmt"],
    disabled: [],
  },
  {
    name: "Health System",
    icon: "🏨🏥🏥",
    users: "500+",
    price: "Custom",
    modules: ["Everything in Hospital +", "Multi-Institution", "Enterprise MPI", "Complex Referrals", "Enterprise BI", "Data Warehouse", "Custom Integrations", "Dedicated Support"],
    disabled: [],
  },
];

const archLayers = [
  { name: "Browser", sub: "React SPA + TailwindCSS + shadcn/ui", color: "#3b82f6", y: 0 },
  { name: "API Gateway", sub: "Express/Fastify + JWT Auth + Tenant Router", color: "#8b5cf6", y: 1 },
  { name: "VistA Gateway", sub: "RPC Broker Client -> Translates REST <-> VistA RPCs", color: "#ec4899", y: 2 },
  { name: "VistA Instances", sub: "Docker containers * 1 per tenant * VEHU base image * YottaDB", color: "#f97316", y: 3 },
  { name: "Platform DB", sub: "PostgreSQL * Tenants, Billing, Analytics, Audit", color: "#10b981", y: 4 },
];

export default function VistAArchitecture() {
  const [activeTab, setActiveTab] = useState("arch");
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);

  const tabs = [
    { id: "arch", label: "Architecture" },
    { id: "entities", label: "Entity Types" },
    { id: "modules", label: "Admin Modules" },
    { id: "phases", label: "Build Phases" },
    { id: "flow", label: "Signup Flow" },
  ];

  const adminModules = [
    { cat: "Core Setup", color: "#dc2626", items: ["Facility & Divisions", "Departments & Services", "Clinic Setup & Patterns", "Ward & Bed Config", "Stop Codes", "Treating Specialties"] },
    { cat: "People", color: "#ea580c", items: ["User Accounts", "Roles & Templates", "Security Keys", "Provider Setup", "Credentials", "Employee Registry"] },
    { cat: "Scheduling", color: "#d97706", items: ["Clinic Availability", "Appointment Types", "Clinic Groups", "Holiday Schedule", "Wait Lists", "Recall Reminders"] },
    { cat: "Pharmacy", color: "#16a34a", items: ["Drug Formulary", "Interactions", "OP Pharmacy Config", "IP Pharmacy Config", "Controlled Substances", "Med Routes & Schedules"] },
    { cat: "Lab & Rad", color: "#0d9488", items: ["Test Catalog", "Collection Samples", "Accession Areas", "Ref Ranges", "Rad Procedures", "Imaging Locations"] },
    { cat: "Billing", color: "#4f46e5", items: ["Site Parameters", "Insurance Companies", "Fee Schedules", "Claims Config", "AR Setup", "PhilHealth/HMO"] },
    { cat: "Clinical Config", color: "#7c3aed", items: ["Order Sets", "Quick Orders", "Consult Services", "TIU Doc Types", "Templates", "Clinical Reminders"] },
    { cat: "Reports & BI", color: "#a21caf", items: ["Ops Dashboard", "Financial Dashboard", "Clinical Quality", "Workforce Metrics", "Report Library", "Custom Builder"] },
  ];

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif", background: "#0a0e17", color: "#e2e8f0", minHeight: "100vh", padding: "0" }}>
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)", borderBottom: "1px solid rgba(99,102,241,0.3)", padding: "24px 32px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff" }}>V</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", color: "#f1f5f9" }}>VistA Evolved -- SaaS Platform Blueprint</h1>
            <p style={{ fontSize: 13, margin: 0, color: "#94a3b8" }}>Architecture * Modules * Entity Types * Build Plan</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: "10px 20px", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
              background: activeTab === t.id ? "rgba(99,102,241,0.15)" : "transparent",
              color: activeTab === t.id ? "#a5b4fc" : "#64748b",
              borderBottom: activeTab === t.id ? "2px solid #6366f1" : "2px solid transparent",
              transition: "all 0.2s", borderRadius: "8px 8px 0 0",
              fontFamily: "inherit",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>

        {activeTab === "arch" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#c7d2fe" }}>System Architecture</h2>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 24, lineHeight: 1.6 }}>
              Every tenant gets a dedicated VistA Docker instance. The web UI never touches M globals directly -- all communication flows through the VistA Gateway via RPC Broker protocol.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {archLayers.map((layer, i) => (
                <div key={i}>
                  <div style={{
                    background: `linear-gradient(90deg, ${layer.color}15, ${layer.color}08)`,
                    border: `1px solid ${layer.color}40`,
                    borderRadius: 12, padding: "18px 24px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: layer.color, marginBottom: 2 }}>{layer.name}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>{layer.sub}</div>
                    </div>
                    {i === 3 && (
                      <div style={{ display: "flex", gap: 8 }}>
                        {["Tenant A", "Tenant B", "Tenant C", "...N"].map((t, j) => (
                          <div key={j} style={{
                            background: `${layer.color}20`, border: `1px solid ${layer.color}50`,
                            borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600, color: layer.color,
                          }}>{t}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  {i < archLayers.length - 1 && (
                    <div style={{ textAlign: "center", color: "#475569", fontSize: 18, lineHeight: "20px" }}>↕</div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 28, background: "#1e1b4b20", border: "1px solid #4f46e530", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#a5b4fc", marginBottom: 10 }}>How a Single Request Flows</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {[
                  "User clicks 'Create Clinic'",
                  "-> React sends POST /api/clinics",
                  "-> JWT validated, tenant ID extracted",
                  "-> Gateway looks up tenant's VistA host:port",
                  "-> RPC Broker connects to VistA",
                  "-> Calls custom RPC 'VE CREATE CLINIC'",
                  "-> M routine edits File #44 via FileMan",
                  "-> Returns IEN + status",
                  "-> Gateway formats JSON response",
                  "-> React renders new clinic in list",
                ].map((step, i) => (
                  <div key={i} style={{
                    fontSize: 11, padding: "5px 10px", borderRadius: 6,
                    background: i === 0 || i === 9 ? "#3b82f620" : i >= 5 && i <= 7 ? "#f9731620" : "#6366f110",
                    border: `1px solid ${i === 0 || i === 9 ? "#3b82f640" : i >= 5 && i <= 7 ? "#f9731640" : "#6366f130"}`,
                    color: i === 0 || i === 9 ? "#93c5fd" : i >= 5 && i <= 7 ? "#fdba74" : "#a5b4fc",
                    fontWeight: 500,
                  }}>{step}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "entities" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#c7d2fe" }}>Entity Type Configurations</h2>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 24, lineHeight: 1.6 }}>
              When a customer signs up, they choose their entity type. This determines which VistA modules are activated, how many divisions are created, and what the admin panel shows.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
              {entityTypes.map((entity, i) => (
                <div key={i} onClick={() => setSelectedEntity(selectedEntity === i ? null : i)} style={{
                  background: selectedEntity === i ? "#1e1b4b30" : "#0f172a80",
                  border: selectedEntity === i ? "1px solid #6366f160" : "1px solid #1e293b",
                  borderRadius: 14, padding: 20, cursor: "pointer", transition: "all 0.2s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{entity.icon}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{entity.name}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#6366f1" }}>{entity.price}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{entity.users} users</div>
                    </div>
                  </div>
                  {selectedEntity === i && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Enabled Modules</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                        {entity.modules.map((m, j) => (
                          <span key={j} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "#22c55e15", border: "1px solid #22c55e30", color: "#86efac" }}>{m}</span>
                        ))}
                      </div>
                      {entity.disabled.length > 0 && (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Hidden / Disabled</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {entity.disabled.map((m, j) => (
                              <span key={j} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "#ef444415", border: "1px solid #ef444430", color: "#fca5a5" }}>{m}</span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "modules" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#c7d2fe" }}>Admin Panel Module Map</h2>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 24, lineHeight: 1.6 }}>
              Every module below replaces a VistA roll-and-scroll menu tree with a modern web interface. Each item maps to specific VistA FileMan files and RPCs.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
              {adminModules.map((mod, i) => (
                <div key={i} style={{
                  background: `${mod.color}08`, border: `1px solid ${mod.color}25`,
                  borderRadius: 12, padding: 18, 
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: mod.color, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: mod.color }} />
                    {mod.cat}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {mod.items.map((item, j) => (
                      <div key={j} style={{
                        fontSize: 12, color: "#cbd5e1", padding: "5px 10px",
                        background: "rgba(15,23,42,0.5)", borderRadius: 6,
                        borderLeft: `2px solid ${mod.color}40`,
                      }}>{item}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, fontSize: 12, color: "#64748b", textAlign: "center" }}>
              ~150+ configuration screens * ~80+ list views * ~50+ reports * ~200+ RPCs to build
            </div>
          </div>
        )}

        {activeTab === "phases" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#c7d2fe" }}>Build Phases -- 48 Week Roadmap</h2>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 24, lineHeight: 1.6 }}>
              Vertical slices: each phase delivers a complete end-to-end module (M routine -> RPC -> API -> React screen), tested against live VistA.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {phases.map((phase) => (
                <div key={phase.id} onClick={() => setSelectedPhase(selectedPhase === phase.id ? null : phase.id)} style={{
                  background: selectedPhase === phase.id ? `${phase.color}12` : "#0f172a80",
                  border: `1px solid ${selectedPhase === phase.id ? phase.color + "50" : "#1e293b"}`,
                  borderRadius: 10, padding: "14px 18px", cursor: "pointer", transition: "all 0.2s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, background: `${phase.color}25`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 800, color: phase.color,
                      }}>{phase.id}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{phase.name}</div>
                    </div>
                    <div style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 12,
                      background: `${phase.color}15`, color: phase.color, fontWeight: 600,
                    }}>Weeks {phase.weeks}</div>
                  </div>
                  {selectedPhase === phase.id && (
                    <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 40 }}>
                      {phase.items.map((item, j) => (
                        <span key={j} style={{
                          fontSize: 11, padding: "4px 10px", borderRadius: 5,
                          background: `${phase.color}10`, border: `1px solid ${phase.color}30`,
                          color: "#cbd5e1",
                        }}>{item}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, padding: 16, background: "#16a34a10", border: "1px solid #16a34a30", borderRadius: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", marginBottom: 6 }}>90-Day MVP (Phases 0-2)</div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                User management + Clinic setup + Basic billing config + Dashboard = enough for a clinic admin to use the web UI instead of roll-and-scroll. This is the launch target.
              </div>
            </div>
          </div>
        )}

        {activeTab === "flow" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#c7d2fe" }}>Customer Signup -> Running Facility</h2>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 24, lineHeight: 1.6 }}>
              Target: under 5 minutes from signup to a fully provisioned VistA instance with web admin panel access.
            </p>
            {[
              { step: 1, title: "Organization Registration", time: "1 min", desc: "Name, contact, country, entity type selection (Solo Clinic / Multi-Clinic / Hospital / Health System)", color: "#3b82f6" },
              { step: 2, title: "Configuration Wizard", time: "2-3 min", desc: "6-step wizard: Facility Identity -> Departments -> Module Selection -> Clinic/Ward Setup -> Initial Users & Roles -> Billing Config", color: "#8b5cf6" },
              { step: 3, title: "VistA Provisioning", time: "30-60 sec (automated)", desc: "Docker container spins up -> Init script configures INSTITUTION, DIVISION, HOSPITAL LOCATIONS, NEW PERSON records, site parameters, formulary -> RPC Broker starts listening", color: "#ec4899" },
              { step: 4, title: "First Login", time: "Immediate", desc: "Admin lands in the dashboard with guided tour -> Setup checklist shows auto-configured items -> Quick links to add users, refine clinics, configure billing", color: "#f97316" },
              { step: 5, title: "Go Live", time: "Same day", desc: "Register first real patient -> Schedule first appointment -> Begin clinical operations -> All through the modern web UI talking to real VistA", color: "#22c55e" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 40 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", background: `${s.color}20`,
                    border: `2px solid ${s.color}`, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 800, color: s.color,
                  }}>{s.step}</div>
                  {i < 4 && <div style={{ width: 2, flexGrow: 1, background: `${s.color}30`, marginTop: 4 }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{s.title}</div>
                    <div style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: `${s.color}15`, color: s.color, fontWeight: 600 }}>{s.time}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
