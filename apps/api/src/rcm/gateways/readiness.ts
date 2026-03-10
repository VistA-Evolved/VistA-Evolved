/**
 * Gateway Readiness Model -- Unified Readiness Checklist
 *
 * Phase 46: Each national gateway has a standardized readiness checklist
 * covering org identifiers, certs, endpoints, testing credentials, and
 * go-live approval. Probes check real prerequisites without PHI.
 *
 * Supported gateways:
 *   PH  -- PhilHealth eClaims 3.0
 *   AU  -- Medicare ECLIPSE (Services Australia)
 *   SG  -- NPHC (MOH Singapore)
 *   NZ  -- ACC Claim API
 *   US  -- EDI Clearinghouse (baseline)
 */

/* -- Types ----------------------------------------------------- */

export type GatewayId = 'ph-philhealth' | 'au-eclipse' | 'sg-nphc' | 'nz-acc' | 'us-edi';

export type ReadinessStatus = 'green' | 'amber' | 'red';

export interface ReadinessCheckResult {
  check: string;
  status: ReadinessStatus;
  message: string;
  required: boolean;
  remediation?: string;
}

export interface GatewayReadiness {
  gatewayId: GatewayId;
  name: string;
  country: string;
  wireFormat: string;
  overallStatus: ReadinessStatus;
  checks: ReadinessCheckResult[];
  enrollmentUrl?: string;
  apiDocsUrl?: string;
  deadlines?: Array<{ date: string; description: string }>;
  lastProbeAt: string;
}

/* -- Check helpers --------------------------------------------- */

function envPresent(varName: string): boolean {
  const v = process.env[varName];
  return typeof v === 'string' && v.trim().length > 0;
}

function checkEnvVar(
  varName: string,
  label: string,
  required: boolean,
  remediation?: string
): ReadinessCheckResult {
  const present = envPresent(varName);
  return {
    check: label,
    status: present ? 'green' : required ? 'red' : 'amber',
    message: present ? `${label} configured` : `${label} not set (env: ${varName})`,
    required,
    remediation: present ? undefined : remediation,
  };
}

/* -- PH PhilHealth eClaims 3.0 --------------------------------- */

function probePhilHealth(): GatewayReadiness {
  const checks: ReadinessCheckResult[] = [];

  checks.push(
    checkEnvVar(
      'PHILHEALTH_FACILITY_CODE',
      'Facility accreditation code',
      true,
      'Register facility at https://www.philhealth.gov.ph/partners/providers/'
    )
  );
  checks.push(
    checkEnvVar(
      'PHILHEALTH_API_TOKEN',
      'API authentication token',
      true,
      'Request eClaims 3.0 API credentials from PhilHealth IT'
    )
  );
  checks.push(
    checkEnvVar(
      'PHILHEALTH_API_ENDPOINT',
      'eClaims 3.0 API endpoint',
      false,
      'Defaults to https://eclaims3.philhealth.gov.ph/api/v3'
    )
  );
  checks.push(
    checkEnvVar(
      'PHILHEALTH_CERT_PATH',
      'TLS client certificate',
      true,
      'Generate facility PKI cert via PhilHealth eClaims 3.0 portal'
    )
  );
  checks.push(
    checkEnvVar(
      'PHILHEALTH_CERT_KEY_PATH',
      'TLS certificate private key',
      true,
      'Must correspond to the facility certificate'
    )
  );

  // eClaims 3.0 specific: electronic SOA
  const soaConfigured = envPresent('PHILHEALTH_SOA_SIGNING_KEY');
  checks.push({
    check: 'Electronic SOA signing capability',
    status: soaConfigured ? 'green' : 'amber',
    message: soaConfigured
      ? 'SOA signing key configured'
      : 'Electronic SOA signing key not set (PHILHEALTH_SOA_SIGNING_KEY)',
    required: false,
    remediation:
      'SOA signing will use HMAC-SHA256 with facility key. Configure PHILHEALTH_SOA_SIGNING_KEY for production.',
  });

  // Test mode check
  const testMode = process.env.PHILHEALTH_TEST_MODE !== 'false';
  checks.push({
    check: 'Production readiness',
    status: testMode ? 'amber' : 'green',
    message: testMode
      ? 'Running in TEST mode (PHILHEALTH_TEST_MODE != false)'
      : 'Production mode enabled',
    required: false,
  });

  // eClaims 3.0 deadline
  const deadlines = [
    { date: '2026-03-31', description: 'eClaims 2.5 and earlier DISABLED' },
    { date: '2026-04-01', description: 'eClaims 3.0 REQUIRED for all submissions' },
  ];

  return {
    gatewayId: 'ph-philhealth',
    name: 'PhilHealth eClaims 3.0',
    country: 'PH',
    wireFormat: 'REST/JSON (CF1-CF4 bundles + electronic SOA)',
    overallStatus: computeOverall(checks),
    checks,
    enrollmentUrl: 'https://www.philhealth.gov.ph/partners/providers/',
    apiDocsUrl: 'https://eclaims3.philhealth.gov.ph/docs',
    deadlines,
    lastProbeAt: new Date().toISOString(),
  };
}

/* -- AU Medicare ECLIPSE --------------------------------------- */

function probeEclipse(): GatewayReadiness {
  const checks: ReadinessCheckResult[] = [];

  checks.push(
    checkEnvVar(
      'ECLIPSE_PRODA_ORG_ID',
      'PRODA organisation ID',
      true,
      'Register at https://www.servicesaustralia.gov.au/proda'
    )
  );
  checks.push(
    checkEnvVar(
      'ECLIPSE_DEVICE_NAME',
      'PRODA device name',
      true,
      'Create device in PRODA organisation portal'
    )
  );
  checks.push(
    checkEnvVar(
      'ECLIPSE_CERT_PATH',
      'PKI device certificate',
      true,
      'Generate device certificate via PRODA portal'
    )
  );
  checks.push(
    checkEnvVar(
      'ECLIPSE_API_ENDPOINT',
      'ECLIPSE claiming endpoint',
      false,
      'Defaults to https://claiming.eclipseservices.gov.au'
    )
  );

  // Provider number check
  checks.push(
    checkEnvVar(
      'ECLIPSE_PROVIDER_NUMBER',
      'Medicare provider number',
      true,
      'Apply via Services Australia provider registration'
    )
  );

  // HPOS/HPI-I check
  checks.push(
    checkEnvVar(
      'ECLIPSE_HPI_I',
      'Healthcare Provider Identifier (HPI-I)',
      false,
      'Register with Australian Digital Health Agency for HPI-I'
    )
  );

  return {
    gatewayId: 'au-eclipse',
    name: 'ECLIPSE (Services Australia Medicare/DVA Gateway)',
    country: 'AU',
    wireFormat: 'HL7v2 / proprietary XML over HTTPS (ECLIPSE Online Claiming)',
    overallStatus: computeOverall(checks),
    checks,
    enrollmentUrl: 'https://www.servicesaustralia.gov.au/proda',
    apiDocsUrl: 'https://www.servicesaustralia.gov.au/eclipse-online-claiming',
    lastProbeAt: new Date().toISOString(),
  };
}

/* -- SG NPHC --------------------------------------------------- */

function probeNphc(): GatewayReadiness {
  const checks: ReadinessCheckResult[] = [];

  checks.push(
    checkEnvVar(
      'NPHC_CORPPASS_CLIENT_ID',
      'CorpPass client ID',
      true,
      'Register at https://www.corppass.gov.sg/ and request NPHC API access'
    )
  );
  checks.push(
    checkEnvVar(
      'NPHC_CORPPASS_SECRET',
      'CorpPass client secret',
      true,
      'Issued during CorpPass API onboarding'
    )
  );
  checks.push(
    checkEnvVar(
      'NPHC_FACILITY_LICENSE',
      'MOH facility license number',
      true,
      'Apply via Singapore MOH at https://www.moh.gov.sg/'
    )
  );
  checks.push(
    checkEnvVar(
      'NPHC_API_ENDPOINT',
      'NPHC API endpoint',
      false,
      'Defaults to https://api.nphc.gov.sg'
    )
  );

  // Role-based access
  checks.push(
    checkEnvVar(
      'NPHC_USER_NRIC_HASH',
      'Authorized user NRIC hash',
      false,
      'NPHC requires named-user authorization via CorpPass role mapping'
    )
  );

  return {
    gatewayId: 'sg-nphc',
    name: 'NPHC Singapore (MediShield Life / MediSave Gateway)',
    country: 'SG',
    wireFormat: 'REST/JSON (MOH NPHC schema)',
    overallStatus: computeOverall(checks),
    checks,
    enrollmentUrl: 'https://www.corppass.gov.sg/',
    apiDocsUrl: 'https://www.moh.gov.sg/',
    lastProbeAt: new Date().toISOString(),
  };
}

/* -- NZ ACC ---------------------------------------------------- */

function probeAcc(): GatewayReadiness {
  const checks: ReadinessCheckResult[] = [];

  checks.push(
    checkEnvVar(
      'ACC_NZ_CLIENT_ID',
      'OAuth2 client ID',
      true,
      'Register as treatment provider at https://www.acc.co.nz/for-providers/ then request API access'
    )
  );
  checks.push(
    checkEnvVar(
      'ACC_NZ_CLIENT_SECRET',
      'OAuth2 client secret',
      true,
      'Issued during ACC developer portal onboarding'
    )
  );
  checks.push(
    checkEnvVar(
      'ACC_NZ_PROVIDER_ID',
      'ACC provider ID',
      true,
      'Assigned during provider registration'
    )
  );
  checks.push(
    checkEnvVar(
      'ACC_NZ_API_ENDPOINT',
      'ACC API endpoint',
      false,
      'Defaults to https://api.acc.co.nz'
    )
  );

  // Sandbox check
  const hasSandbox = envPresent('ACC_NZ_SANDBOX_ENDPOINT');
  checks.push({
    check: 'Sandbox environment',
    status: hasSandbox || envPresent('ACC_NZ_CLIENT_ID') ? 'green' : 'amber',
    message: hasSandbox
      ? 'Sandbox endpoint configured'
      : 'Sandbox at https://sandbox.api.acc.co.nz (default when test mode)',
    required: false,
  });

  return {
    gatewayId: 'nz-acc',
    name: 'ACC New Zealand Claim API',
    country: 'NZ',
    wireFormat: 'REST/JSON (ACC Claim API v2, OAuth2)',
    overallStatus: computeOverall(checks),
    checks,
    enrollmentUrl: 'https://www.acc.co.nz/for-providers/',
    apiDocsUrl: 'https://developer.acc.co.nz/',
    lastProbeAt: new Date().toISOString(),
  };
}

/* -- US EDI (baseline) ----------------------------------------- */

function probeUsEdi(): GatewayReadiness {
  const checks: ReadinessCheckResult[] = [];

  checks.push(
    checkEnvVar(
      'CLEARINGHOUSE_SFTP_HOST',
      'Clearinghouse SFTP host',
      true,
      'Configure clearinghouse connection (e.g., Availity, Change Healthcare)'
    )
  );
  checks.push(
    checkEnvVar(
      'CLEARINGHOUSE_SFTP_USER',
      'SFTP username',
      true,
      'Provided by clearinghouse during enrollment'
    )
  );
  checks.push(
    checkEnvVar(
      'CLEARINGHOUSE_SENDER_ID',
      'Sender/submitter ID',
      true,
      'ISA06 sender ID assigned by clearinghouse'
    )
  );

  return {
    gatewayId: 'us-edi',
    name: 'US EDI Clearinghouse',
    country: 'US',
    wireFormat: 'X12 5010 (837P/I, 835, 270/271, 276/277)',
    overallStatus: computeOverall(checks),
    checks,
    lastProbeAt: new Date().toISOString(),
  };
}

/* -- Overall status computation -------------------------------- */

function computeOverall(checks: ReadinessCheckResult[]): ReadinessStatus {
  const hasRed = checks.some((c) => c.status === 'red' && c.required);
  if (hasRed) return 'red';
  const hasAmber = checks.some((c) => c.status === 'amber' || (c.status === 'red' && !c.required));
  if (hasAmber) return 'amber';
  return 'green';
}

/* -- Public API ------------------------------------------------ */

const GATEWAY_PROBES: Record<GatewayId, () => GatewayReadiness> = {
  'ph-philhealth': probePhilHealth,
  'au-eclipse': probeEclipse,
  'sg-nphc': probeNphc,
  'nz-acc': probeAcc,
  'us-edi': probeUsEdi,
};

export function probeGateway(id: GatewayId): GatewayReadiness {
  const probe = GATEWAY_PROBES[id];
  if (!probe) {
    return {
      gatewayId: id,
      name: 'Unknown Gateway',
      country: '??',
      wireFormat: 'unknown',
      overallStatus: 'red',
      checks: [
        {
          check: 'Gateway exists',
          status: 'red',
          message: `Unknown gateway: ${id}`,
          required: true,
        },
      ],
      lastProbeAt: new Date().toISOString(),
    };
  }
  return probe();
}

export function probeAllGateways(): GatewayReadiness[] {
  return Object.keys(GATEWAY_PROBES).map((id) => probeGateway(id as GatewayId));
}

export function getGatewayIds(): GatewayId[] {
  return Object.keys(GATEWAY_PROBES) as GatewayId[];
}
