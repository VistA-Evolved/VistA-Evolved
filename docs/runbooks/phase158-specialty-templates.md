# Phase 158 — Specialty Template & Workflow Studio

## Overview
Phase 158 introduces a clinical note template engine with 45+ specialty packs,
structured versioning, quick text library, and a note builder for clinical encounters.
All templates use a local-draft model with explicit TIU RPC migration targets.

## Architecture

### Backend (`apps/api/src/templates/`)
| File | Purpose |
|------|---------|
| `types.ts` | Template DSL: sections, fields, specialty tags, mapping targets |
| `template-engine.ts` | Core CRUD, versioning, note generation, quick text management |
| `specialty-packs.ts` | 45+ specialty template definitions with reusable section builders |
| `template-routes.ts` | Fastify REST API plugin (~15 endpoints) |
| `index.ts` | Barrel export |

### Database
- **SQLite**: `clinical_template`, `template_version_event`, `quick_text` (auto-created)
- **PostgreSQL**: Migration v23 (`phase158_specialty_templates`) with UUID, JSONB, TIMESTAMPTZ
- **RLS**: All 3 tables in `tenantTables` array with `tenant_id` column

### UI (`apps/web/`)
| Page | Path |
|------|------|
| Template Admin | `/cprs/admin/templates` |
| Note Builder | `/encounter/note-builder` |

## API Endpoints

### Admin (requires admin session)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/templates` | List templates (filter by specialty, status) |
| POST | `/admin/templates` | Create template |
| GET | `/admin/templates/:id` | Get template detail |
| PUT | `/admin/templates/:id` | Update template (auto-version bump) |
| POST | `/admin/templates/:id/publish` | Publish template |
| POST | `/admin/templates/:id/archive` | Archive template |
| GET | `/admin/templates/:id/versions` | Version history |
| GET | `/admin/templates/stats` | Aggregate statistics |
| POST | `/admin/templates/seed` | Seed all specialty packs |
| GET | `/admin/templates/quick-text` | List quick texts |
| POST | `/admin/templates/quick-text` | Create quick text |
| PUT | `/admin/templates/quick-text/:id` | Update quick text |
| DELETE | `/admin/templates/quick-text/:id` | Delete quick text |

### Clinical (requires session)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/templates/specialty-packs` | List available specialty packs |
| POST | `/encounter/note-builder/generate` | Generate draft note from template |

## Specialty Coverage (45+ specialties)
primary-care, family-medicine, internal-medicine, pediatrics, ob-gyn,
emergency-medicine, urgent-care, cardiology, pulmonology, endocrinology,
nephrology, neurology, psychiatry, psychology-behavioral, orthopedics,
general-surgery, anesthesia, icu-critical-care, dermatology, ophthalmology,
ent-otolaryngology, gastroenterology, oncology, hematology, radiology,
laboratory, nursing, physical-therapy, rehabilitation, dental,
infectious-disease, urology, rheumatology, family-planning, palliative-care,
geriatrics, allergy-immunology, vascular-surgery, plastic-surgery, podiatry,
nutrition-dietetics, social-work, pharmacy-clinical, wound-care,
pain-management, + discharge-summary

## VistA Integration Posture
- **Mode**: `local_draft` — all notes are generated locally
- **Migration target**: `TIU CREATE RECORD + TIU SET DOCUMENT TEXT`
- **RPCs registered**: TIU CREATE RECORD, TIU SET DOCUMENT TEXT, TIU SIGN RECORD
  (present in rpcRegistry.ts)
- **No fake success**: Note builder explicitly returns `mode: "local_draft"`
  and `migrationTarget` in every response

## How to Test

### 1. Seed Templates
```bash
curl -X POST http://localhost:3001/admin/templates/seed \
  -b cookies.txt -H "Content-Type: application/json"
```

### 2. List Templates
```bash
curl http://localhost:3001/admin/templates \
  -b cookies.txt
```

### 3. Generate a Draft Note
```bash
curl -X POST http://localhost:3001/encounter/note-builder/generate \
  -b cookies.txt -H "Content-Type: application/json" \
  -d '{"templateId":"<id>","patientDfn":"3","fieldValues":{}}'
```

### 4. View Stats
```bash
curl http://localhost:3001/admin/templates/stats \
  -b cookies.txt
```

## Store Policy
| Store | Classification | Durability |
|-------|---------------|------------|
| template-store | critical | pg_backed |
| template-version-events | audit | pg_backed |
| quick-text-store | registry | pg_backed |

## Research Sources
See `docs/research/phase158-sources.md` for 12 cited references including
CMS E&M guidelines, ACEP documentation standards, Joint Commission, and
VistA TIU Technical Manual.
