# ADR: Theming Engine — Legacy / Modern / Tenant Branding

- **Status**: Accepted
- **Date**: 2026-03-01
- **Phase**: 389 (W22-P1)

## Context

VistA-Evolved serves multiple user populations:
- **Legacy VistA users** prefer a familiar CPRS-like layout (sidebar nav,
  tabbed panels, dense data display)
- **Modern users** prefer contemporary UX (card-based, responsive, richer
  whitespace)
- **Tenant branding** requires custom logos, colors, and facility names

Additionally, global markets (US VA, Philippine hospitals, etc.) have different
visual expectations and accessibility requirements.

The current UI uses Tailwind CSS with a consistent but single design language.
We need a theming system that supports multiple visual modes without
duplicating components.

## Decision

**CSS custom property (CSS variable) theming with preset modes and tenant
override capability.**

### Theme Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Theme Provider (React Context)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ Legacy Mode  │  │ Modern Mode │  │ Tenant Override  │  │
│  │ --primary:   │  │ --primary:  │  │ --primary:      │  │
│  │ --bg:        │  │ --bg:       │  │ --bg:           │  │
│  │ --text:      │  │ --text:     │  │ (from tenant DB)│  │
│  │ --density:   │  │ --density:  │  │                 │  │
│  │  compact     │  │  normal     │  │                 │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Theme Tokens

| Token Category | Examples |
|----------------|----------|
| **Color** | `--color-primary`, `--color-bg`, `--color-surface`, `--color-text`, `--color-border`, `--color-error`, `--color-warning`, `--color-success` |
| **Typography** | `--font-family`, `--font-size-base`, `--font-size-sm`, `--font-weight-heading` |
| **Spacing** | `--space-xs`, `--space-sm`, `--space-md`, `--space-lg` |
| **Density** | `--density-mode` (`compact` / `normal` / `comfortable`) — controls padding, row height, font scaling |
| **Layout** | `--sidebar-width`, `--panel-border-radius`, `--nav-style` (`tabs` / `sidebar` / `breadcrumb`) |
| **Brand** | `--brand-logo-url`, `--brand-name`, `--brand-accent` |

### Preset Modes

1. **Legacy** (`theme: "legacy"`):
   - Compact density (tight rows, small font)
   - Tab-based navigation (CPRS-style)
   - Blue/gray palette, minimal whitespace
   - Flat borders, square corners
   - Optimized for keyboard-heavy workflows

2. **Modern** (`theme: "modern"`):
   - Normal density, generous whitespace
   - Card-based panels with subtle shadows
   - Contemporary color palette (soft blues, whites)
   - Rounded corners, responsive layout
   - Touch-friendly targets

3. **High Contrast** (`theme: "high-contrast"`):
   - WCAG AAA contrast ratios
   - Large text option
   - No color-only indicators (icons + text always)
   - Forced borders on all interactive elements

### Tenant Override

Tenants can override any token via `POST /admin/tenant-config`:
```json
{
  "theme": {
    "base": "modern",
    "overrides": {
      "--color-primary": "#004B87",
      "--brand-logo-url": "/assets/facility-logo.png",
      "--brand-name": "Metro General Hospital"
    }
  }
}
```

Overrides are stored per-tenant in the platform DB and applied as inline CSS
custom properties on the root element.

### Why CSS custom properties?

- Zero-JS theme switching (CSS only, no re-render)
- Works with Tailwind (via `theme()` function bridging)
- No component duplication — same component, different variables
- SSR-safe (can inject in `<style>` tag)
- Standard web platform — no framework lock-in

### Why not Tailwind config per theme?

- Requires build-time theme selection or multiple builds
- CSS variables work at runtime with zero build cost
- Tailwind's `@apply` can reference CSS variables for best of both worlds

### Why not styled-components / CSS-in-JS?

- Additional runtime overhead for theme resolution
- Harder to override from tenant config
- Our existing Tailwind setup is performant and well-understood

## Consequences

- All UI components must use CSS custom properties (not hardcoded colors)
- Theme provider reads tenant config and sets CSS variables on mount
- User preference (legacy/modern) stored in browser localStorage
- Tenant admin override takes precedence over user preference
- High-contrast mode is always available regardless of tenant config
- Pack-specific theming (e.g., dark mode for radiology PACS) is possible
  via scoped CSS variable overrides on specific panels
- Wave 22 P9 implements the theming engine; P2 content packs can ship
  theme-aware templates
