/**
 * VistA RPC Broker configuration -- loaded from environment variables.
 *
 * +----------------------------------------------------------------------+
 * |  CREDENTIALS SETUP                                                  |
 * |                                                                     |
 * |  1. Copy the template:   cp apps/api/.env.example apps/api/.env.local |
 * |  2. Fill in credentials in  apps/api/.env.local                     |
 * |                                                                     |
 * |  WorldVistA Docker sandbox default accounts (from Docker Hub docs): |
 * |    PROV123  / PROV123!!   -> PROVIDER,CLYDE WV   (DUZ 87)           |
 * |    PHARM123 / PHARM123!!  -> PHARMACIST,LINDA WV                    |
 * |    NURSE123 / NURSE123!!  -> NURSE,HELEN WV                         |
 * |                                                                     |
 * |  .env.local is git-ignored. Never commit real credentials.          |
 * |  See also: apps/api/.env.example, docs/runbooks/vista-rpc-default- |
 * |            patient-list.md                                          |
 * +----------------------------------------------------------------------+
 */

export const VISTA_HOST = process.env.VISTA_HOST || '127.0.0.1';
export const VISTA_PORT = Number(process.env.VISTA_PORT || 9430);
export const VISTA_ACCESS_CODE = process.env.VISTA_ACCESS_CODE;
export const VISTA_VERIFY_CODE = process.env.VISTA_VERIFY_CODE;
export const VISTA_CONTEXT = process.env.VISTA_CONTEXT || 'OR CPRS GUI CHART';

export const VISTA_POOL_SIZE = Number(process.env.VISTA_POOL_SIZE || 1);
export const VISTA_MAX_CONNECTIONS_PER_USER = Number(
  process.env.VISTA_MAX_CONNECTIONS_PER_USER || 3
);
export const VISTA_MAX_POOL_TOTAL = Number(process.env.VISTA_MAX_POOL_TOTAL || 50);
export const VISTA_IDLE_TIMEOUT_MS = Number(process.env.VISTA_IDLE_TIMEOUT_MS || 300_000);

export const validateCredentials = (): void => {
  if (!VISTA_ACCESS_CODE || !VISTA_VERIFY_CODE) {
    throw new Error(
      'Missing VistA credentials. Create apps/api/.env.local and set:\nVISTA_ACCESS_CODE=<code>\nVISTA_VERIFY_CODE=<code>\nVISTA_HOST=127.0.0.1\nVISTA_PORT=9430'
    );
  }
};

export const requireCredentials = (): boolean => {
  return !!(VISTA_ACCESS_CODE && VISTA_VERIFY_CODE);
};
