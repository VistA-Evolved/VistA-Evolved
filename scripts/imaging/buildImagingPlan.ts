/**
 * Phase 81 — Imaging Plan Artifact Builder
 *
 * Generates /artifacts/phase81/imaging-plan.json describing:
 * - Imaging data sources (VistA RPCs, Orthanc, DICOMweb)
 * - Endpoint inventory
 * - Pending targets for RPCs not available on sandbox
 * - Viewer posture (OHIF, fallback instructions)
 *
 * Usage: npx tsx scripts/imaging/buildImagingPlan.ts
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface ImagingEndpoint {
  method: string;
  path: string;
  description: string;
  rpcUsed: string[];
  fallback: string;
  status: 'live' | 'pending' | 'stub';
}

interface ImagingPlan {
  phase: 81;
  title: string;
  generatedAt: string;
  dataSources: {
    vistaRpcs: {
      name: string;
      rpc: string;
      vistaFile: string;
      sandboxAvailable: boolean;
      purpose: string;
    }[];
    orthancDicomWeb: {
      configured: boolean;
      url: string;
      endpoints: string[];
    };
    registryIntegrations: {
      types: string[];
      purpose: string;
    };
  };
  endpoints: ImagingEndpoint[];
  viewerPosture: {
    primaryViewer: string;
    fallback: string;
    configEnvVar: string;
  };
  pendingTargets: {
    rpc: string;
    reason: string;
    migrationPath: string;
  }[];
  uiComponents: {
    component: string;
    file: string;
    features: string[];
  }[];
}

const plan: ImagingPlan = {
  phase: 81,
  title: 'Imaging Viewer v1 -- VistA Metadata Grounded + DICOM Viewer Posture',
  generatedAt: new Date().toISOString(),

  dataSources: {
    vistaRpcs: [
      {
        name: 'MAG4 REMOTE PROCEDURE',
        rpc: 'MAG4 REMOTE PROCEDURE',
        vistaFile: '#2005 IMAGE',
        sandboxAvailable: false,
        purpose: 'Patient image/study list from VistA Imaging',
      },
      {
        name: 'MAG4 PAT GET IMAGES',
        rpc: 'MAG4 PAT GET IMAGES',
        vistaFile: '#2005 IMAGE',
        sandboxAvailable: false,
        purpose: 'Full patient image inventory with paths',
      },
      {
        name: 'MAGG PAT PHOTOS',
        rpc: 'MAGG PAT PHOTOS',
        vistaFile: '#2005 IMAGE',
        sandboxAvailable: false,
        purpose: 'Patient photos (thumbnails, profiles)',
      },
      {
        name: 'RA DETAILED REPORT',
        rpc: 'RA DETAILED REPORT',
        vistaFile: '#74 RAD/NUC MED REPORTS',
        sandboxAvailable: false,
        purpose: 'Radiology report text (preliminary, final, addendum)',
      },
      {
        name: 'TIU GET RECORD TEXT',
        rpc: 'TIU GET RECORD TEXT',
        vistaFile: '#8925 TIU DOCUMENT',
        sandboxAvailable: true,
        purpose: 'Document text retrieval (fallback for radiology notes)',
      },
      {
        name: 'TIU DOCUMENTS BY CONTEXT',
        rpc: 'TIU DOCUMENTS BY CONTEXT',
        vistaFile: '#8925 TIU DOCUMENT',
        sandboxAvailable: true,
        purpose: 'Query documents by type/context (radiology note lookup)',
      },
    ],
    orthancDicomWeb: {
      configured: true,
      url: 'http://localhost:8042',
      endpoints: [
        'GET /dicom-web/studies (QIDO-RS)',
        'GET /dicom-web/studies/{uid}/metadata (WADO-RS)',
        'GET /dicom-web/studies/{uid}/series (QIDO-RS series)',
        'POST /dicom-web/studies (STOW-RS)',
      ],
    },
    registryIntegrations: {
      types: ['pacs-vna', 'dicom', 'dicomweb'],
      purpose: 'External PACS/VNA via integration registry (tenant-scoped)',
    },
  },

  endpoints: [
    {
      method: 'GET',
      path: '/imaging/studies/:dfn',
      description: 'Patient imaging study list (VistA MAG4 -> Orthanc -> registry)',
      rpcUsed: ['MAG4 REMOTE PROCEDURE', 'MAG4 PAT GET IMAGES'],
      fallback: 'Orthanc QIDO-RS',
      status: 'live',
    },
    {
      method: 'GET',
      path: '/imaging/report/:studyId',
      description: 'Radiology report text for a study',
      rpcUsed: ['RA DETAILED REPORT', 'TIU GET RECORD TEXT'],
      fallback: 'pendingTarget with VistA file info',
      status: 'live',
    },
    {
      method: 'GET',
      path: '/imaging/viewer-link/:studyId',
      description: 'DICOM viewer URL or integration instructions',
      rpcUsed: [],
      fallback: 'OHIF viewer URL or setup instructions',
      status: 'live',
    },
  ],

  viewerPosture: {
    primaryViewer: 'OHIF (Open Health Imaging Foundation)',
    fallback: 'Integration instructions shown when OHIF/Orthanc not reachable',
    configEnvVar: 'OHIF_VIEWER_URL (default: http://localhost:3003)',
  },

  pendingTargets: [
    {
      rpc: 'MAG4 REMOTE PROCEDURE',
      reason: 'Not available on WorldVistA Docker sandbox',
      migrationPath:
        'Install VistA Imaging package on production VistA. RPC available in VA systems with Imaging v3.0+.',
    },
    {
      rpc: 'MAG4 PAT GET IMAGES',
      reason: 'Not available on WorldVistA Docker sandbox',
      migrationPath:
        'Requires VistA Imaging package. Returns full image inventory with file paths.',
    },
    {
      rpc: 'RA DETAILED REPORT',
      reason: 'RPC exists but Radiology data (File #74) is empty on sandbox',
      migrationPath: 'Create test radiology cases via RA REG or production radiology workflow.',
    },
    {
      rpc: 'MAGV RAD EXAM LIST',
      reason: 'Not available on WorldVistA Docker sandbox',
      migrationPath: 'VistA Imaging VistARad component. Lists radiology exams with reading status.',
    },
  ],

  uiComponents: [
    {
      component: 'ImagingPanel',
      file: 'apps/web/src/components/cprs/panels/ImagingPanel.tsx',
      features: [
        'Study list with modality filter',
        'Study detail panel with metadata',
        'Inline report viewer (Phase 81)',
        'OHIF viewer launcher',
        'Viewer-not-configured instructions (Phase 81)',
        'Break-glass access (Phase 24)',
        'Worklist, Orders, Devices, Audit tabs',
      ],
    },
  ],
};

// Write artifact
const outDir = join(process.cwd(), 'artifacts', 'phase81');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'imaging-plan.json');
writeFileSync(outPath, JSON.stringify(plan, null, 2), 'utf-8');

// eslint-disable-next-line no-console
console.log(`Phase 81 imaging plan written to ${outPath}`);
console.log(`  Endpoints: ${plan.endpoints.length}`);
console.log(`  VistA RPCs: ${plan.dataSources.vistaRpcs.length}`);
console.log(`  Pending targets: ${plan.pendingTargets.length}`);
console.log(`  UI components: ${plan.uiComponents.length}`);
