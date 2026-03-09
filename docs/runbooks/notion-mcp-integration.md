# Notion MCP Integration Guide

> Phase 725 (PromptFolder: 725-PHASE-725-NOTION-MCP-INTEGRATION)

## Overview

This guide explains how to set up Notion as a documentation mirror for
VistA Evolved using the Notion MCP server in Cursor.

## Prerequisites

1. A Notion workspace with admin access
2. A Notion Integration token (Internal Integration)
3. Cursor IDE with MCP support

## Step 1: Create the Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Name: `VistA Evolved Docs Sync`
4. Select your workspace
5. Set capabilities:
   - Read content: Yes
   - Update content: Yes
   - Insert content: Yes
6. Copy the **Internal Integration Token** (starts with `ntn_`)

## Step 2: Configure Notion MCP in Cursor

Create/edit `.cursor/mcp.json` in the project root:

```json
{
  "mcpServers": {
    "notionApi": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "OPENAPI_MCP_HEADERS": "{\"Authorization\": \"Bearer ntn_YOUR_TOKEN_HERE\", \"Notion-Version\": \"2022-06-28\"}"
      }
    }
  }
}
```

Replace `ntn_YOUR_TOKEN_HERE` with your actual integration token.

## Step 3: Share Notion Pages with the Integration

In Notion, share the target database/pages with your integration:

1. Open the parent page for documentation
2. Click "..." menu > "Connections" > Add your integration
3. Repeat for each top-level page

## Step 4: Notion Workspace Structure

The recommended Notion workspace mirrors the repo documentation:

```
VistA Evolved
  |-- Architecture
  |     |-- System Overview (from docs/ARCHITECTURE.md)
  |     |-- Module Architecture (from config/modules.json)
  |     |-- Reuse vs Build (from docs/architecture/reuse-vs-build.md)
  |     |-- Patient Identity (from docs/architecture/patient-identity.md)
  |     |-- Healthcare Facility Research (from docs/architecture/healthcare-facility-research.md)
  |     |-- RCM Architecture (from docs/architecture/rcm-gateway-architecture.md)
  |     |-- Product Modularity (from docs/architecture/product-modularity-v1.md)
  |
  |-- Phase Tracking (database)
  |     |-- Phase Number | Title | Status | Prompt Folder | Key Files
  |     |-- (populated from docs/qa/phase-index.json)
  |
  |-- Runbook Catalog (database)
  |     |-- Runbook Name | Domain | Path | Last Updated
  |     |-- (populated from docs/runbooks/)
  |
  |-- Feature Status (database)
  |     |-- Capability | Module | Status | Adapter | Target RPC
  |     |-- (populated from config/capabilities.json)
  |
  |-- Audit Reports
  |     |-- Enterprise Readiness (from docs/audits/enterprise-readiness-report.md)
  |     |-- Reality Map (from docs/audits/reality-map.md)
  |     |-- VistA Brain Compliance (from docs/audits/vista-brain-compliance.md)
  |     |-- RCM MVP Proof (from docs/audits/rcm-mvp-proof.md)
  |     |-- Certification Readiness (from docs/audits/certification-readiness.md)
  |
  |-- Onboarding
  |     |-- Getting Started (from docs/ONBOARDING.md)
  |     |-- Run From Zero (from docs/runbooks/run-from-zero.md)
  |
  |-- Bug Tracker
  |     |-- (from docs/BUG-TRACKER.md)
  |
  |-- Decision Log (database)
  |     |-- ADR Title | Status | Date | Key Decision
  |     |-- (populated from docs/decisions/)
```

## Step 5: Run the Sync Script

The sync script pushes markdown documentation to Notion:

```powershell
node scripts/notion/sync-to-notion.mjs
```

This script:
1. Reads all markdown files in `docs/`
2. Converts them to Notion block format
3. Creates or updates pages in the configured Notion workspace
4. Logs sync results to `artifacts/notion-sync.log`

## Using Notion MCP in Cursor

Once configured, the Notion MCP provides tools like:

- **Search**: Find pages by title or content
- **Create**: Create new pages/databases
- **Update**: Update page content
- **Query databases**: Filter and sort database entries

Example agent prompt:
> "Update the Phase Tracking database in Notion with the latest phase-index.json"

## Environment Variables

| Variable | Description | Required |
| -------- | ----------- | -------- |
| NOTION_TOKEN | Internal Integration Token | Yes |
| NOTION_ROOT_PAGE_ID | Parent page ID for docs | Yes |
| NOTION_PHASE_DB_ID | Phase tracking database ID | For sync script |
| NOTION_RUNBOOK_DB_ID | Runbook catalog database ID | For sync script |
| NOTION_FEATURE_DB_ID | Feature status database ID | For sync script |

## Troubleshooting

### MCP server not connecting
- Verify `npx @notionhq/notion-mcp-server` works standalone
- Check the token starts with `ntn_`
- Ensure the integration has correct capabilities

### Pages not appearing
- The integration must be shared with each page it needs to access
- Check the Notion API version matches (2022-06-28)

### Sync script errors
- Ensure NOTION_TOKEN and NOTION_ROOT_PAGE_ID are set
- Check rate limits (Notion API: 3 requests/second)
