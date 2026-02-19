# VistA Evolved Authorization Policy
# Phase 35 — OPA-compatible Rego policy
#
# This policy file can be loaded by OPA sidecar or evaluated in-process.
# Default-deny: all requests are denied unless explicitly allowed.

package vista.authz

import rego.v1

# Default deny
default allow := false

# Admin can do anything
allow if {
    "admin" in input.user.roles
}

# Provider: full clinical access
allow if {
    "provider" in input.user.roles
    startswith(input.action, "clinical.")
}
allow if {
    "provider" in input.user.roles
    startswith(input.action, "phi.")
}
allow if {
    "provider" in input.user.roles
    input.action == "imaging.view"
}
allow if {
    "provider" in input.user.roles
    input.action == "imaging.order"
}

# Nurse: vitals, notes, view access
allow if {
    "nurse" in input.user.roles
    input.action in {
        "clinical.vitals-add",
        "clinical.note-create",
        "phi.vitals-view",
        "phi.notes-view",
        "phi.allergies-view",
        "phi.demographics-view",
        "phi.patient-search",
        "phi.patient-select",
        "phi.patient-list",
        "phi.medications-view",
        "phi.problems-view",
        "phi.labs-view",
        "phi.reports-view",
        "imaging.view",
    }
}

# Pharmacist: medications + read access
allow if {
    "pharmacist" in input.user.roles
    input.action in {
        "clinical.medication-add",
        "phi.medications-view",
        "phi.allergies-view",
        "phi.demographics-view",
        "phi.patient-search",
        "phi.patient-select",
        "phi.patient-list",
        "phi.vitals-view",
        "phi.notes-view",
        "phi.problems-view",
        "phi.labs-view",
        "phi.reports-view",
    }
}

# Clerk: read-only, no clinical writes
allow if {
    "clerk" in input.user.roles
    startswith(input.action, "phi.")
    not endswith(input.action, "-add")
    not endswith(input.action, "-create")
}

# Patient: own data only (enforced by patient_dfn match)
allow if {
    "patient" in input.user.roles
    startswith(input.action, "portal.")
    input.resource.patient_dfn == input.user.patient_dfn
}

# Support: read audit, system info, no clinical data
allow if {
    "support" in input.user.roles
    input.action in {
        "audit.view",
        "audit.query",
        "system.health",
        "system.metrics",
    }
}

# Break-glass override (time-limited, always audited)
allow if {
    input.user.break_glass == true
    input.user.break_glass_expires_at > time.now_ns() / 1000000
}

# Tenant isolation: deny cross-tenant access
deny if {
    input.resource.tenant_id != ""
    input.user.tenant_id != ""
    input.resource.tenant_id != input.user.tenant_id
}
